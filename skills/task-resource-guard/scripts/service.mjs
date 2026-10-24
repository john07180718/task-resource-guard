import net from 'node:net';
import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID, randomBytes, timingSafeEqual } from 'node:crypto';
import { assertState, inside, inspect, noLinks, pipeFor } from './common.mjs';

export async function registerService(ctx, { serviceName, kind, ttlMs = 6 * 3600000, idleMs = 15 * 60000,
  safeToStop, shutdown, ownedDisposableDevelopmentService = false } = {}) {
  if (!['dev-server', 'test-worker', 'automation-controller'].includes(kind) ||
      !/^[\p{L}\p{N}_. -]{1,80}$/u.test(serviceName || '') ||
      !Number.isSafeInteger(ttlMs) || ttlMs <= 0 || !Number.isSafeInteger(idleMs) || idleMs < 0 ||
      typeof safeToStop !== 'function' || safeToStop.constructor.name === 'AsyncFunction' ||
      typeof shutdown !== 'function' || ownedDisposableDevelopmentService !== true) {
    throw Error('Explicit ownership, synchronous safety check and normal shutdown callback required');
  }
  const entryPoint = path.resolve(process.argv[1] || '');
  if (!inside(ctx.workspace, entryPoint)) throw Error('Service entry point is outside the selected workspace');
  await noLinks(entryPoint);
  await assertState(ctx);
  const identity = (await inspect(ctx, [process.pid])).get(process.pid);
  if (!identity?.currentUser || identity.systemService || identity.name.toLowerCase() !== 'node.exe') {
    throw Error('Not an eligible current-user Node service');
  }
  const id = randomUUID(), capability = randomBytes(32).toString('hex'), registeredAt = Date.now();
  const record = { schema: 1, id, serviceName, kind, identity, entryPoint, workspace: ctx.workspace,
    registeredAt: new Date(registeredAt).toISOString(), expiresAt: new Date(registeredAt + ttlMs).toISOString(), ttlMs, idleMs, capability };
  let active = 0, lastActive = Date.now(), closing = false, closed;
  const stateNow = () => {
    if (closing) return 'closing';
    if (Date.now() < registeredAt + ttlMs) return 'not-expired';
    if (active || Date.now() - lastActive < idleMs) return 'busy';
    try {
      const safety = safeToStop();
      if (safety && typeof safety.then === 'function') {
        // A Promise is not synchronous proof of idleness. Observe a possible
        // rejection so a mistaken adapter cannot crash the service during probe.
        void Promise.resolve(safety).catch(() => {});
        return 'blocked';
      }
      return safety === true && active === 0 ? 'ready' : 'busy';
    }
    catch { return 'blocked'; }
  };
  const server = net.createServer(socket => {
    let buffer = '', processed = false;
    socket.setTimeout(2500, () => socket.destroy());
    socket.on('error', () => {});
    socket.on('data', chunk => {
      if (processed) return;
      buffer += chunk;
      if (buffer.length > 4096) return socket.destroy();
      if (!buffer.includes('\n')) return;
      processed = true;
      socket.setTimeout(12000, () => socket.destroy());
      void (async () => {
        const request = JSON.parse(buffer.slice(0, buffer.indexOf('\n')));
        const supplied = Buffer.from(String(request.capability || ''), 'hex');
        if (supplied.length !== 32 || !timingSafeEqual(supplied, Buffer.from(capability, 'hex')) ||
            request.id !== id || !['probe', 'stop'].includes(request.action)) return socket.destroy();
        const state = stateNow();
        if (request.action === 'probe' || state !== 'ready') return socket.end(JSON.stringify({ state }) + '\n');
        closing = true; // Atomic gate; run() rejects new work before shutdown awaits.
        try {
          await shutdown();
          socket.end(JSON.stringify({ state: 'shutdown-requested' }) + '\n');
        } catch {
          socket.end(JSON.stringify({ state: 'close-failed-no-force' }) + '\n');
        } finally { await closeControl(); }
      })().catch(() => socket.end(JSON.stringify({ state: 'blocked' }) + '\n'));
    });
  });
  function closeControl() {
    closed ??= new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    return closed;
  }
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(pipeFor(id), resolve); });
  try { await fs.writeFile(path.join(ctx.state, 'services', id + '.json'), JSON.stringify(record) + '\n', { flag: 'wx' }); }
  catch (error) { await closeControl(); throw error; }
  return {
    id,
    async run(work) {
      if (closing) throw Error('Service closing; new work rejected');
      active++; lastActive = Date.now();
      try { return await work(); } finally { active--; lastActive = Date.now(); }
    },
    async dispose() {
      if (active) throw Error('Cannot dispose while work is active');
      closing = true;
      await closeControl();
    },
  };
}
