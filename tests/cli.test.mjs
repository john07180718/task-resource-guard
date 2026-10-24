import test from 'node:test';
import assert from 'node:assert/strict';
import { parseArgs } from '../skills/task-resource-guard/scripts/cli.mjs';

test('cleanup defaults to preview and requires an explicit workspace', () => {
  assert.deepEqual(parseArgs(['--workspace', 'C:\\example project']), { options: { workspace: 'C:\\example project' }, mode: 'dry-run' });
  assert.equal(parseArgs(['--apply', '--workspace', 'C:\\example']).mode, 'apply');
  assert.equal(parseArgs(['--workspace', 'C:\\example', '--init']).mode, 'init');
  for (const args of [[], ['--apply'], ['--workspace'], ['--workspace', '--apply'],
    ['--workspace', 'C:\\example', '--apply', '--dry-run'],
    ['--workspace', 'C:\\example', '--apply', '--apply'],
    ['--workspace', 'C:\\example', '--force'],
    ['--workspace', 'C:\\example', '--workspace', 'C:\\other']]) {
    assert.throws(() => parseArgs(args));
  }
});
