// Internal child for registered-demo.mjs. The demo copies this entry point
// into its newly created private workspace before starting it through IPC.
import http from 'node:http';
import { finished } from 'node:stream/promises';

async function serve() {
  if (process.platform !== 'win32' || typeof process.send !== 'function') {
    throw Error('Run node examples/registered-demo.mjs on Windows.');
  }
  const [source, workspace, mode, powershell] = process.argv.slice(2);
  if (!['idle', 'busy'].includes(mode) || new URL(source).protocol !== 'file:') throw Error('Invalid demo child configuration');
  let registration, server, closeHttpPromise, finishPromise;
  let stopping = false, pendingWork, activeRequests = 0;
  const jobs = new Set();

  const tell = message => new Promise(resolve => {
    if (!process.connected) return resolve();
    try { process.send(message, () => resolve()); } catch { resolve(); }
  });
  const disconnect = () => { if (process.connected) process.disconnect(); };
  const releaseWork = () => pendingWork?.release();
  const closeHttp = () => {
    if (closeHttpPromise) return closeHttpPromise;
    if (!server?.listening) return Promise.resolve();
    closeHttpPromise = new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    return closeHttpPromise;
  };
  function finish() {
    stopping = true;
    releaseWork();
    finishPromise ??= (async () => {
      // A finish/disconnect may arrive while CIM registration is still running.
      // Wait for it before disposing the handles it might yet create.
      await startup.catch(() => {});
      releaseWork();
      await closeHttp();
      await Promise.allSettled([...jobs]);
      await registration?.dispose();
      disconnect();
    })();
    return finishPromise;
  }
  const requestFinish = () => {
    void finish().catch(async () => {
      process.exitCode = 1;
      await tell({ type: 'failed' });
      disconnect();
    });
  };
  process.on('disconnect', requestFinish);
  process.on('SIGINT', requestFinish);
  process.on('SIGTERM', requestFinish);
  process.on('message', message => {
    if (message === 'finish-work') releaseWork();
    if (message === 'finish') requestFinish();
  });

  async function handle(req, res) {
    activeRequests++;
    // Keep work active until the actual response finishes, including error paths.
    const responseDone = finished(res, { cleanup: true });
    void responseDone.catch(() => {});
    let held;
    try {
      if (req.method === 'GET' && req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('demo service ready\n');
      } else if (mode === 'busy' && req.method === 'POST' && req.url === '/work' && !pendingWork) {
        let release;
        const done = new Promise(resolve => { release = resolve; });
        held = pendingWork = { release };
        // If the parent loses its own HTTP connection, end this synthetic job
        // through its cancellation path instead of leaving an orphaned promise.
        res.once('close', release);
        await tell({ type: 'work-started' });
        if (stopping) release();
        await done;
        res.off('close', release);
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('demo work completed\n');
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('demo route not found\n');
      }
      await responseDone;
      return Boolean(held);
    } finally {
      if (held && pendingWork === held) pendingWork = undefined;
      activeRequests--;
    }
  }

  const startup = (async () => {
    const { context } = await import(new URL('common.mjs', source));
    const { registerService } = await import(new URL('service.mjs', source));
    const ctx = await context({ workspace, powershell });
    registration = await registerService(ctx, {
      serviceName: 'demo-' + mode,
      kind: 'dev-server',
      ownedDisposableDevelopmentService: true,
      // These short values are ONLY for this isolated walkthrough. They are
      // not the toolkit defaults or recommendations for an actual service.
      ttlMs: 1000,
      idleMs: 0,
      safeToStop: () => activeRequests === 0 && pendingWork === undefined,
      shutdown: async () => {
        stopping = true;
        await closeHttp();
        await tell({ type: 'normal-shutdown' });
        // Do not await registration.dispose() inside shutdown: the toolkit
        // still has to acknowledge this control request and close its pipe.
        disconnect();
      },
    });
    if (stopping) return;
    server = http.createServer((req, res) => {
      if (stopping) { res.writeHead(503); res.end(); return; }
      // Every HTTP work entry, including health checks, goes through the gate.
      const job = registration.run(() => handle(req, res));
      jobs.add(job);
      // Send completion only after run() has decremented its active-work count.
      void job.then(completed => completed ? tell({ type: 'work-completed' }) : undefined).catch(() => {
        if (!res.writableEnded && !res.destroyed) { res.writeHead(503); res.end(); }
      }).finally(() => jobs.delete(job));
    });
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', resolve);
    });
  })();

  try {
    await startup;
    if (stopping) await finish();
    else await tell({ type: 'ready', id: registration.id, port: server.address().port });
  } catch {
    process.exitCode = 1;
    await tell({ type: 'failed' });
    await finish();
  }
}

try { await serve(); }
catch {
  process.exitCode = 1;
  if (process.connected) process.disconnect();
  console.error('This internal example must be launched by registered-demo.mjs on Windows.');
}
