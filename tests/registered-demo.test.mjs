import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { runDemo } from '../examples/registered-demo.mjs';

const powershell = process.env.TRG_TEST_POWERSHELL || 'pwsh.exe';

test('registered HTTP demo proves preview, busy protection and normal exits', { skip: process.platform !== 'win32' }, async t => {
  const lines = [];
  const result = await runDemo({ powershell, report: line => { lines.push(line); t.diagnostic(line); } });
  assert.deepEqual(result, {
    dryRunPreservedBoth: true, busyProtected: true, workCompleted: true,
    normalExits: 2, workspaceRemoved: true,
  });
  assert.deepEqual(lines.map(line => line.slice(0, 5)), ['[1/5]', '[2/5]', '[3/5]', '[4/5]', '[5/5]']);
  assert.equal(lines.some(line => /capability|ownerSid|[A-Za-z]:\\/.test(line)), false);
});

test('interrupting the registered demo completes its own active work and tears down normally', { skip: process.platform !== 'win32' }, async t => {
  const controller = new AbortController();
  const lines = [];
  await assert.rejects(runDemo({
    powershell,
    signal: controller.signal,
    report: line => {
      lines.push(line);
      t.diagnostic(line);
      if (line.startsWith('[1/5]')) controller.abort();
    },
  }), error => error.name === 'AbortError');
  assert.ok(lines.some(line => line === '[cleanup] Demo children closed normally; the temporary demo workspace was removed.'));
  assert.equal(lines.some(line => line.startsWith('[5/5]')), false);
});

test('non-Windows demo refuses before creating workspace contents', { skip: process.platform === 'win32' }, async () => {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'trg-unsupported-demo-test-'));
  const variables = ['TMPDIR', 'TMP', 'TEMP'];
  const previous = new Map(variables.map(name => [name, process.env[name]]));
  try {
    for (const name of variables) process.env[name] = temporary;
    await assert.rejects(runDemo({ report: () => assert.fail('Unsupported demo must not start') }), /requires Windows/);
    assert.deepEqual(await fs.readdir(temporary), []);
  } finally {
    for (const name of variables) {
      if (previous.get(name) === undefined) delete process.env[name];
      else process.env[name] = previous.get(name);
    }
    await fs.rm(temporary, { recursive: true });
  }
});
