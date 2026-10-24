import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { fork, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { context, initialize, readRecords, inspect, equalIdentity, pipeFor, noLinks } from '../skills/task-resource-guard/scripts/common.mjs';
import { cleanup } from '../skills/task-resource-guard/scripts/cleanup.mjs';
import { registerService } from '../skills/task-resource-guard/scripts/service.mjs';

const exec = promisify(execFile);
const source = new URL('../skills/task-resource-guard/scripts/', import.meta.url);
const powershell = process.env.TRG_TEST_POWERSHELL || 'pwsh.exe';

test('Windows isolated registry safety and real private-child normal shutdown', { skip: process.platform !== 'win32' }, async t => {
  const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'trg-validation-'));
  const children = [];
  let primaryError;
  try {
    const ctx = await context({ workspace, powershell });
    await assert.rejects(cleanup(ctx), error => error.code === 'ENOENT');
    assert.deepEqual(await fs.readdir(workspace), []);
    await initialize(ctx);
    await assert.rejects(initialize(ctx), error => error.code === 'EEXIST');
    await assert.rejects(context({ workspace, state: path.join(os.tmpdir(), '.task-resource-guard'), powershell }), /direct/);
    await assert.rejects(registerService(ctx, { serviceName: 'no-ownership', kind: 'test-worker', safeToStop: () => true, shutdown: () => {} }), /ownership/);
    await assert.rejects(registerService(ctx, { serviceName: 'async-safety', kind: 'test-worker', ownedDisposableDevelopmentService: true, safeToStop: async () => true, shutdown: () => {} }), /synchronous/);
    await fs.copyFile(fileURLToPath(new URL('./fixtures/worker.mjs', import.meta.url)), path.join(workspace, 'worker.mjs'));
    async function start(mode) {
      const child = fork(path.join(workspace, 'worker.mjs'), [source.href, workspace, mode, powershell], { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe', 'ipc'] });
      const record = { child, mode, closed: false, messages: [] };
      children.push(record);
      // Only synthetic stderr is held for diagnosis, never a live service's command line.
      let stderr = '';
      child.stderr.on('data', chunk => { stderr += chunk; });
      child.stdout.resume();
      record.ended = new Promise(resolve => child.once('exit', (code, signal) => { record.closed = true; record.exit = { code, signal }; resolve(); }));
      await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(Error('Fixture did not become ready: ' + mode + ' ' + stderr)), 30000);
        child.on('message', data => { record.messages.push(data); if (data.ready) { clearTimeout(timer); record.id = data.id; resolve(); } });
        child.once('error', error => { clearTimeout(timer); reject(error); });
        child.once('exit', () => { clearTimeout(timer); reject(Error('Early fixture exit: ' + stderr)); });
      });
      return record;
    }
    const expired = await start('expired'), busy = await start('busy'), future = await start('future');
    const unregistered = await start('unregistered'), race = await start('race'), closeFailure = await start('close-failure');
    const asyncResult = await start('async-result');
    const records = await readRecords(ctx), original = records.find(record => record.id === expired.id);
    // Use the protected busy child as the PID-reuse comparator, so the identity
    // remains present even after the eligible expired child exits normally.
    const protectedRecord = records.find(record => record.id === busy.id);
    const mismatch = { ...protectedRecord, id: randomUUID(), identity: { ...protectedRecord.identity, started: '2000-01-01T00:00:00.0000000Z' } };
    await fs.writeFile(path.join(ctx.state, 'services', mismatch.id + '.json'), JSON.stringify(mismatch), { flag: 'wx' });
    for (const field of ['pid', 'name', 'path', 'started', 'ownerSid']) {
      assert.equal(equalIdentity(original.identity, { ...original.identity, [field]: field === 'pid' ? 1 : 'different' }), false, field);
    }
    const snapshot = async () => {
      const entries = await fs.readdir(path.join(ctx.state, 'services'));
      return Promise.all(entries.sort().map(async name => [name, await fs.readFile(path.join(ctx.state, 'services', name), 'utf8')]));
    };
    const before = await snapshot();
    const preview = await cleanup(ctx);
    assert.ok(preview.some(record => record.id === expired.id && record.event === 'would-request-shutdown'));
    assert.ok(preview.some(record => record.id === asyncResult.id && record.reason === 'blocked'));
    assert.deepEqual(await snapshot(), before);
    assert.deepEqual(await fs.readdir(ctx.state), ['services']);
    assert.equal((await inspect(ctx, children.map(record => record.child.pid))).size, children.length);
    t.diagnostic('Dry-run preserved registry bytes, created no logs and stopped no children.');

    // Invalid capability must not close even an otherwise idle registered worker.
    await new Promise((resolve, reject) => {
      const socket = net.createConnection(pipeFor(expired.id));
      socket.setTimeout(5000, () => { socket.destroy(); reject(Error('Authentication test timed out')); });
      socket.on('error', reject);
      socket.once('connect', () => socket.write(JSON.stringify({ id: expired.id, capability: '0'.repeat(64), action: 'stop' }) + '\n'));
      socket.once('close', resolve);
    });
    assert.equal(expired.closed, false);
    const applied = await cleanup(ctx, { apply: true });
    assert.equal(applied.filter(record => record.event === 'exit-confirmed').length, 1);
    assert.ok(applied.some(record => record.id === expired.id && record.event === 'exit-confirmed'));
    assert.ok(applied.some(record => record.id === busy.id && record.reason === 'busy'));
    assert.ok(applied.some(record => record.id === future.id && record.event === 'not-expired'));
    assert.ok(applied.some(record => record.id === mismatch.id && record.event === 'identity-mismatch-skip'));
    assert.ok(applied.some(record => record.id === race.id && record.reason === 'busy'));
    assert.ok(applied.some(record => record.id === closeFailure.id && record.reason === 'close-failed-no-force'));
    assert.ok(applied.some(record => record.id === asyncResult.id && record.reason === 'blocked'));
    const still = await inspect(ctx, children.map(record => record.child.pid));
    assert.equal(still.has(expired.child.pid), false);
    for (const record of [busy, future, unregistered, race, closeFailure, asyncResult]) assert.equal(still.has(record.child.pid), true, record.mode);
    assert.ok(expired.messages.some(message => message.gateRejected));
    t.diagnostic('Only eligible child exited. Busy/future/unregistered/raced/failed-close/invalid-Promise children survived; new work was gated before shutdown.');

    // Actual CLI with no mode flag remains dry-run and prints no capability.
    let cli;
    try { cli = await exec(process.execPath, [fileURLToPath(new URL('cli.mjs', source)), '--workspace', workspace, '--powershell', powershell], { windowsHide: true }); }
    catch (error) {
      // This registry deliberately contains a mismatched identity; CLI must flag it.
      assert.equal(error.code, 2);
      cli = error;
    }
    const report = JSON.parse(cli.stdout);
    assert.equal(report.mode, 'dry-run');
    assert.equal(report.counts['identity-mismatch-skip'], 1);
    for (const record of records) assert.equal(cli.stdout.includes(record.capability), false);

    const link = path.join(workspace, 'redirected');
    await fs.symlink(ctx.state, link, 'junction');
    await assert.rejects(noLinks(link), /Linked|redirected/);
    // Remove this test's known junction only; never traverse it.
    await fs.rmdir(link);
    const unsafe = { ...original, id: randomUUID(), workspace: path.parse(workspace).root };
    await fs.writeFile(path.join(ctx.state, 'services', unsafe.id + '.json'), JSON.stringify(unsafe), { flag: 'wx' });
    assert.ok((await cleanup(ctx)).some(record => record.id === unsafe.id && record.event === 'invalid-registration'));
    t.diagnostic('CLI preview, capability authentication, real junction rejection and cross-workspace registration rejection passed.');
  } catch (error) { primaryError = error; }
  finally {
    const cleanupErrors = [];
    for (const record of children) {
      if (!record.closed && record.child.connected) record.child.send('finish');
    }
    // Observe teardown without killing or assuming that elapsed time proves exit.
    for (const record of children) {
      const timer = setTimeout(() => { t.diagnostic('Still awaiting normal teardown for synthetic ' + record.mode); }, 15000);
      try {
        await record.ended;
        assert.equal(record.exit.signal, null, record.mode);
        assert.equal(record.exit.code, 0, record.mode);
      } catch (error) { cleanupErrors.push(error); }
      finally { clearTimeout(timer); }
    }
    try {
      if (!children.every(record => record.closed)) throw Error('Synthetic resources not confirmed closed; preserve test directory');
      if (path.dirname(workspace).toLowerCase() !== path.resolve(os.tmpdir()).toLowerCase() || !path.basename(workspace).startsWith('trg-validation-')) throw Error('Unexpected teardown path');
      await noLinks(workspace);
      await fs.rm(workspace, { recursive: true });
      t.diagnostic(`All ${children.length} private children exited normally; synthetic registry directory removed. No force used.`);
    } catch (error) { cleanupErrors.push(error); }
    if (primaryError || cleanupErrors.length) throw new AggregateError([...(primaryError ? [primaryError] : []), ...cleanupErrors], 'Isolation or cleanup verification failed');
  }
});
