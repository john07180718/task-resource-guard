import fs from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fork } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { context, initialize, noLinks } from '../skills/task-resource-guard/scripts/common.mjs';
import { cleanup } from '../skills/task-resource-guard/scripts/cleanup.mjs';

const source = new URL('../skills/task-resource-guard/scripts/', import.meta.url);
const fixture = new URL('./registered-service.mjs', import.meta.url);
const prefix = 'task-resource-guard-demo-';

export function parseDemoArgs(args) {
  if (args.length === 0) return { powershell: 'pwsh.exe' };
  if (args.length === 2 && args[0] === '--powershell' && args[1] && !args[1].startsWith('--')) {
    return { powershell: args[1] };
  }
  throw Error('Usage: node examples/registered-demo.mjs [--powershell PATH_TO_PWSH]');
}

function interrupted() {
  const error = Error('The demo was interrupted; its private resources are being closed normally.');
  error.name = 'AbortError';
  return error;
}

function requireCondition(condition, message) {
  if (!condition) throw Error(message);
}

function startChild(workspace, mode, powershell) {
  const child = fork(path.join(workspace, 'registered-service.mjs'), [source.href, workspace, mode, powershell], {
    windowsHide: true,
    // Registry data, paths and child stderr are never copied into demo output.
    stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
  });
  const record = { child, mode, messages: [], events: new EventEmitter(), closed: false };
  let resolveEnded;
  record.ended = new Promise(resolve => { resolveEnded = resolve; });
  child.on('message', message => {
    record.messages.push(message);
    record.events.emit('change');
  });
  child.once('error', () => {
    record.failed = true;
    if (!child.pid) {
      record.closed = true;
      record.exit = { code: null, signal: null };
      resolveEnded();
    }
    record.events.emit('change');
  });
  child.once('exit', (code, signal) => {
    record.closed = true;
    record.exit = { code, signal };
    resolveEnded();
    record.events.emit('change');
  });
  return record;
}

function send(record, message) {
  if (record.closed || !record.child.connected) return;
  // A child may disconnect between the check and send. Observe that race
  // without turning it into an unhandled IPC error or a force-stop fallback.
  try { record.child.send(message, () => {}); } catch { /* Exit is checked separately. */ }
}

function waitForMessage(record, type, signal) {
  return new Promise((resolve, reject) => {
    let timer;
    const finish = (error, message) => {
      clearTimeout(timer);
      record.events.off('change', check);
      signal?.removeEventListener('abort', abort);
      if (error) reject(error); else resolve(message);
    };
    const abort = () => finish(interrupted());
    const check = () => {
      const message = record.messages.find(item => item?.type === type);
      if (message) return finish(null, message);
      if (record.failed || record.closed || record.messages.some(item => item?.type === 'failed')) {
        finish(Error('A synthetic service could not complete ' + type + '. Check Node, PowerShell 7 and CIM access.'));
      }
    };
    timer = setTimeout(() => finish(Error('Timed out awaiting the synthetic service; requesting normal teardown.')), 45000);
    record.events.on('change', check);
    signal?.addEventListener('abort', abort, { once: true });
    if (signal?.aborted) abort(); else check();
  });
}

function request(port, pathname, { held = false } = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      host: '127.0.0.1', port, path: pathname,
      method: held ? 'POST' : 'GET', agent: false,
      headers: { Connection: 'close' },
    }, res => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { body += chunk; });
      res.once('error', reject);
      res.once('end', () => resolve({ status: res.statusCode, body }));
    });
    req.once('error', reject);
    // The held job is released by an explicit demo message, never by elapsed
    // time. Only ordinary health requests have a client socket timeout.
    if (!held) req.setTimeout(10000, () => req.destroy(Error('Demo HTTP health request timed out')));
    req.end();
  });
}

async function confirmNormalExit(record) {
  await record.ended;
  requireCondition(record.exit.code === 0 && record.exit.signal === null, 'A demo child did not exit normally.');
}

export async function runDemo({ powershell = 'pwsh.exe', report = console.log, signal } = {}) {
  // This guard precedes mkdir, IPC children, listeners and registry operations.
  if (process.platform !== 'win32') throw Error('The registered-service demo requires Windows, Node and PowerShell 7.');
  const checkAbort = () => { if (signal?.aborted) throw interrupted(); };
  checkAbort();
  const children = [];
  let temporaryRoot, workspace, heldRequest, primaryError, completed = false;
  const finishChildren = () => { for (const record of children) send(record, 'finish'); };
  signal?.addEventListener('abort', finishChildren);
  try {
    // Windows may expose TEMP through an 8.3 alias. Choose the canonical
    // existing root before creating our new directory, then keep the core's
    // strict no-links check on that selected path and all of its ancestors.
    temporaryRoot = await fs.realpath(os.tmpdir());
    await noLinks(temporaryRoot);
    workspace = await fs.mkdtemp(path.join(temporaryRoot, prefix));
    const ctx = await context({ workspace, powershell });
    await initialize(ctx);
    await fs.copyFile(fileURLToPath(fixture), path.join(workspace, 'registered-service.mjs'));
    checkAbort();
    for (const mode of ['idle', 'busy']) {
      const record = startChild(workspace, mode, powershell);
      children.push(record);
      const ready = await waitForMessage(record, 'ready', signal);
      record.id = ready.id;
      record.port = ready.port;
    }
    const [idle, busy] = children;
    heldRequest = request(busy.port, '/work', { held: true });
    // Observe rejection immediately, including errors before the later await.
    void heldRequest.catch(() => {});
    await waitForMessage(busy, 'work-started', signal);
    report('[1/5] Two private loopback HTTP services started; one has an active demo request.');

    // Demo-only TTL is 1 second and idleMs is zero. Waiting for eligibility
    // is separate from checking whether real work has actually completed.
    await delay(1100, undefined, { signal });
    checkAbort();
    const preview = await cleanup(ctx);
    requireCondition(preview.some(item => item.id === idle.id && item.event === 'would-request-shutdown'), 'Dry-run did not identify the eligible idle service.');
    requireCondition(preview.some(item => item.id === busy.id && item.reason === 'busy'), 'Dry-run did not protect the active HTTP request.');
    for (const record of children) {
      requireCondition(!record.closed && (await request(record.port, '/health')).status === 200, 'Dry-run did not preserve both HTTP services.');
    }
    checkAbort();
    report('[2/5] Dry-run: idle would close; busy is protected; both HTTP services still respond.');

    const applied = await cleanup(ctx, { apply: true });
    requireCondition(applied.some(item => item.id === idle.id && item.event === 'exit-confirmed'), 'The idle service exit was not confirmed; no force was used.');
    requireCondition(applied.some(item => item.id === busy.id && item.reason === 'busy'), 'Apply did not preserve the active HTTP request.');
    await confirmNormalExit(idle);
    requireCondition(idle.messages.some(item => item.type === 'normal-shutdown'), 'The idle HTTP service did not acknowledge normal close.');
    requireCondition(!busy.closed && (await request(busy.port, '/health')).status === 200, 'The busy HTTP service was not preserved.');
    requireCondition(!busy.messages.some(item => item.type === 'work-completed'), 'The held request completed before its explicit release.');
    checkAbort();
    report('[3/5] Apply: idle exited normally; the busy HTTP request and service were preserved.');

    send(busy, 'finish-work');
    const response = await heldRequest;
    requireCondition(response.status === 200 && response.body === 'demo work completed\n', 'The protected HTTP request did not finish normally.');
    await waitForMessage(busy, 'work-completed', signal);
    checkAbort();
    const finalPass = await cleanup(ctx, { apply: true });
    requireCondition(finalPass.some(item => item.id === busy.id && item.event === 'exit-confirmed'), 'The completed service exit was not confirmed; no force was used.');
    await confirmNormalExit(busy);
    requireCondition(busy.messages.some(item => item.type === 'normal-shutdown'), 'The busy HTTP service did not acknowledge normal close.');
    checkAbort();
    report('[4/5] The held request completed; a second apply closed its now-idle service normally.');
    completed = true;
  } catch (error) {
    primaryError = signal?.aborted ? interrupted() : error;
  } finally {
    signal?.removeEventListener('abort', finishChildren);
    finishChildren();
    const cleanupErrors = [];
    for (const record of children) {
      const notice = setTimeout(() => report('[cleanup] Still awaiting a private demo child to close normally; no force is used.'), 15000);
      try { await confirmNormalExit(record); } catch (error) { cleanupErrors.push(error); }
      finally { clearTimeout(notice); }
    }
    if (heldRequest) await heldRequest.catch(() => {});
    if (workspace) {
      try {
        requireCondition(children.every(record => record.closed), 'Demo exits are unconfirmed; preserving the temporary workspace.');
        requireCondition(path.dirname(workspace).toLowerCase() === path.resolve(temporaryRoot).toLowerCase() && path.basename(workspace).startsWith(prefix), 'Unexpected demo directory; refusing removal.');
        await noLinks(workspace);
        // This is exclusively the newly created synthetic directory. The
        // cleanup toolkit itself never deletes a user's registry or files.
        await fs.rm(workspace, { recursive: true });
      } catch (error) { cleanupErrors.push(error); }
    }
    if (cleanupErrors.length) {
      throw new AggregateError([...(primaryError ? [primaryError] : []), ...cleanupErrors], 'The demo or its normal teardown could not be fully verified. No force was used.');
    }
    if (workspace) report(completed
      ? '[5/5] Both child exits verified; the temporary demo workspace was removed.'
      : '[cleanup] Demo children closed normally; the temporary demo workspace was removed.');
  }
  if (primaryError) throw primaryError;
  return { dryRunPreservedBoth: true, busyProtected: true, workCompleted: true, normalExits: children.length, workspaceRemoved: true };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const controller = new AbortController();
  const stop = () => controller.abort();
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
  try {
    const options = parseDemoArgs(process.argv.slice(2));
    await runDemo({ ...options, signal: controller.signal });
  } catch (error) {
    // Never print raw registry data, private paths or underlying PowerShell output.
    console.error(process.platform !== 'win32'
      ? 'The registered-service demo requires Windows, Node and PowerShell 7. No demo resources were created.'
      : error.name === 'AbortError'
        ? 'Demo interrupted; normal teardown completed.'
        : 'Demo could not complete. Check Node, PowerShell 7, CIM access and a local temporary directory. No force-stop fallback is used.');
    process.exitCode = error.name === 'AbortError' ? 130 : 1;
  } finally {
    process.off('SIGINT', stop);
    process.off('SIGTERM', stop);
  }
}
