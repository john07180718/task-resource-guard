import net from 'node:net';
import { readRecords, validService, inspect, equalIdentity, pipeFor, digest, normalized, delay } from './common.mjs';

function rpc(record, action) {
  return new Promise((resolve, reject) => {
    let buffer = '', done = false;
    const socket = net.createConnection(pipeFor(record.id));
    const timer = setTimeout(() => finish(Error('Control request timed out')), 12000);
    function finish(error, data) {
      if (done) return;
      done = true; clearTimeout(timer); socket.destroy();
      if (error) reject(error); else resolve(data);
    }
    socket.once('connect', () => socket.write(JSON.stringify({ id: record.id, capability: record.capability, action }) + '\n'));
    socket.on('error', error => finish(error));
    socket.on('end', () => { if (!done) finish(Error('Incomplete control response')); });
    socket.on('data', chunk => {
      buffer += chunk;
      if (buffer.length > 4096) return finish(Error('Oversized control response'));
      if (buffer.includes('\n')) {
        try { finish(null, JSON.parse(buffer.slice(0, buffer.indexOf('\n')))); }
        catch (error) { finish(error); }
      }
    });
  });
}

export async function cleanup(ctx, { apply = false } = {}) {
  const records = await readRecords(ctx);
  const mutex = net.createServer(socket => socket.destroy());
  await new Promise((resolve, reject) => {
    mutex.once('error', reject);
    mutex.listen('\\\\.\\pipe\\task-resource-guard-run-' + digest(normalized(ctx.state)).slice(0, 24), resolve);
  });
  const results = [];
  try {
    // Query only PIDs in valid registrations, never all processes by executable name.
    const valid = records.filter(record => validService(ctx, record));
    const current = await inspect(ctx, valid.map(record => record.identity.pid));
    for (const record of records) {
      const base = { id: record.id };
      const emit = (event, reason) => results.push({ ...base, event, ...(reason ? { reason } : {}) });
      try {
        if (!validService(ctx, record)) { emit('invalid-registration'); continue; }
        const found = current.get(record.identity.pid);
        if (!found) { emit('already-exited'); continue; }
        if (!found.currentUser || found.systemService || !equalIdentity(found, record.identity)) {
          emit('identity-mismatch-skip'); continue;
        }
        if (Date.now() < Date.parse(record.expiresAt)) { emit('not-expired'); continue; }
        const probe = await rpc(record, 'probe');
        if (probe.state !== 'ready') { emit('service-skip', probe.state); continue; }
        if (!apply) { emit('would-request-shutdown'); continue; }
        const recheck = (await inspect(ctx, [record.identity.pid])).get(record.identity.pid);
        if (!recheck?.currentUser || recheck.systemService || !equalIdentity(recheck, record.identity)) {
          emit('identity-changed-before-stop'); continue;
        }
        const stopped = await rpc(record, 'stop'); // Service checks work/idle state again.
        if (stopped.state !== 'shutdown-requested') { emit('service-skip', stopped.state); continue; }
        let after;
        for (let attempt = 0; attempt < 3; attempt++) {
          await delay(200);
          after = (await inspect(ctx, [record.identity.pid])).get(record.identity.pid);
          if (!after || !equalIdentity(after, record.identity)) break;
        }
        if (!after) emit('exit-confirmed');
        else if (!equalIdentity(after, record.identity)) emit('identity-changed-after-stop-no-force');
        else emit('exit-not-confirmed-no-force');
      } catch { emit('blocked-no-force'); }
    }
    return results;
  } finally { await new Promise((resolve, reject) => mutex.close(error => error ? reject(error) : resolve())); }
}
