// Synthetic private child only. Parent supplies this candidate's source URL.
const [source, workspace, mode, powershell] = process.argv.slice(2);
const { context } = await import(new URL('common.mjs', source));
const { registerService } = await import(new URL('service.mjs', source));
let service, releaseWork, busyWork, finishing = false, checks = 0;
async function finish() {
  if (finishing) return;
  finishing = true;
  releaseWork?.();
  await busyWork;
  await service?.dispose();
  if (process.connected) process.disconnect();
}
process.on('disconnect', () => { void finish(); });
process.on('message', message => { if (message === 'finish') void finish(); });
if (mode !== 'unregistered') {
  const ctx = await context({ workspace, powershell });
  service = await registerService(ctx, {
    serviceName: 'synthetic-' + mode, kind: 'test-worker', ownedDisposableDevelopmentService: true,
    ttlMs: mode === 'future' ? 3600000 : 1, idleMs: 0,
    safeToStop: () => {
      if (mode === 'async-result') return Promise.reject(Error('Synthetic invalid asynchronous safety check'));
      return mode !== 'race' || ++checks === 1;
    },
    shutdown: async () => {
      if (mode === 'close-failure') throw Error('Synthetic close failure');
      let gateRejected = false;
      try { await service.run(() => {}); } catch { gateRejected = true; }
      if (process.connected) process.send({ gateRejected });
      if (process.connected) process.disconnect();
    },
  });
  if (mode === 'busy') busyWork = service.run(() => new Promise(resolve => { releaseWork = resolve; }));
}
process.send({ ready: true, id: service?.id, mode });
