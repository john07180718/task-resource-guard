import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { context, initialize } from './common.mjs';
import { cleanup } from './cleanup.mjs';

export function parseArgs(args) {
  const options = {}, seen = new Set();
  let mode;
  for (let index = 0; index < args.length; index++) {
    const flag = args[index];
    if (seen.has(flag)) throw Error('Duplicate option');
    seen.add(flag);
    if (['--init', '--apply', '--dry-run'].includes(flag)) {
      if (mode) throw Error('Choose only one mode');
      mode = flag.slice(2);
    } else if (['--workspace', '--state', '--powershell'].includes(flag)) {
      const value = args[++index];
      if (!value || value.startsWith('--')) throw Error('Option value missing');
      options[flag.slice(2)] = value;
    } else throw Error('Unknown option');
  }
  if (!options.workspace) throw Error('--workspace is required');
  return { options, mode: mode || 'dry-run' };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const { options, mode } = parseArgs(process.argv.slice(2));
    const ctx = await context(options);
    if (mode === 'init') {
      await initialize(ctx);
      console.log(JSON.stringify({ mode, result: 'new-private-registry-created' }));
    } else {
      const results = await cleanup(ctx, { apply: mode === 'apply' });
      const counts = {};
      for (const item of results) counts[item.event] = (counts[item.event] || 0) + 1;
      console.log(JSON.stringify({ mode, counts }));
      if (results.some(item => /blocked|invalid|mismatch|changed|not-confirmed/.test(item.event) || ['blocked', 'close-failed-no-force'].includes(item.reason))) process.exitCode = 2;
    }
  } catch {
    // Avoid dumping capabilities, registry bodies, private paths or child stderr.
    console.error('Stopped safely. Check explicit workspace, private registry, PowerShell/CIM access and selected mode. No force fallback.');
    process.exitCode = 1;
  }
}
