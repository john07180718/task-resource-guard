import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createHash } from 'node:crypto';

const exec = promisify(execFile);
const scripts = path.dirname(fileURLToPath(import.meta.url));
export const normalized = value => path.resolve(value).toLowerCase();
export const inside = (root, value) => normalized(value).startsWith(normalized(root) + path.sep);
export const digest = value => createHash('sha256').update(value).digest('hex');
export const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
export const validId = id => typeof id === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(id);
export const pipeFor = id => {
  if (!validId(id)) throw Error('Invalid registration ID');
  return '\\\\.\\pipe\\task-resource-guard-' + id;
};
export const equalIdentity = (a, b) => !!a && !!b && a.pid === b.pid && a.name === b.name &&
  typeof a.path === 'string' && typeof b.path === 'string' && normalized(a.path) === normalized(b.path) &&
  a.started === b.started && a.ownerSid === b.ownerSid;

export async function noLinks(value) {
  for (let cursor = path.resolve(value); ; cursor = path.dirname(cursor)) {
    const item = await fs.lstat(cursor);
    if (item.isSymbolicLink() || normalized(await fs.realpath(cursor)) !== normalized(cursor)) {
      throw Error('Linked or redirected path rejected');
    }
    if (path.dirname(cursor) === cursor) break;
  }
}

export async function context({ workspace, state, powershell = 'pwsh.exe' } = {}) {
  if (process.platform !== 'win32') throw Error('Registered cleanup currently supports Windows only');
  if (typeof workspace !== 'string' || !/^[a-z]:[\\/]/i.test(workspace) || workspace.slice(2).includes(':')) {
    throw Error('An explicit absolute local Windows workspace is required');
  }
  workspace = path.resolve(workspace);
  if (workspace === path.parse(workspace).root) throw Error('A drive root is not a workspace');
  state = path.resolve(state || path.join(workspace, '.task-resource-guard'));
  if (normalized(path.dirname(state)) !== normalized(workspace) || path.basename(state) !== '.task-resource-guard') {
    throw Error('State must be the direct .task-resource-guard child of the selected workspace');
  }
  if (typeof powershell !== 'string' || !powershell) throw Error('PowerShell executable is required');
  await noLinks(workspace);
  if (!(await fs.stat(workspace)).isDirectory()) throw Error('Workspace must be a directory');
  const ps = async (script, args = []) => {
    const { stdout } = await exec(powershell, ['-NoProfile', '-NonInteractive', '-File', path.join(scripts, script), ...args],
      { windowsHide: true, timeout: 20000, maxBuffer: 512 * 1024 });
    return stdout.replace(/^\uFEFF/, '').trim();
  };
  return { workspace, state, ps };
}

export async function assertState(ctx) {
  await noLinks(ctx.state);
  await noLinks(path.join(ctx.state, 'services'));
  for (const directory of [ctx.state, path.join(ctx.state, 'services')]) {
    await ctx.ps('state-permissions.ps1', ['-Path', directory, '-VerifyOnly']);
  }
}

export async function initialize(ctx) {
  // Refuse to adopt an existing directory or alter its permissions.
  await fs.mkdir(ctx.state);
  await noLinks(ctx.state);
  await ctx.ps('state-permissions.ps1', ['-Path', ctx.state]);
  await fs.mkdir(path.join(ctx.state, 'services'));
  await assertState(ctx);
}

export async function inspect(ctx, ids) {
  if (!ids.length) return new Map();
  if (ids.some(pid => !Number.isSafeInteger(pid) || pid <= 0)) throw Error('Invalid PID');
  const data = JSON.parse(await ctx.ps('inspect.ps1', ['-Ids', [...new Set(ids)].join(',')]));
  if (!Array.isArray(data)) throw Error('Invalid identity response');
  return new Map(data.map(item => [item.pid, item]));
}

export async function readRecords(ctx) {
  await assertState(ctx);
  const folder = path.join(ctx.state, 'services');
  const names = await fs.readdir(folder);
  if (names.length > 256) throw Error('Registry limit reached; manual review required');
  if (names.some(name => !name.endsWith('.json') || !validId(name.slice(0, -5)))) {
    throw Error('Unexpected registry content; manual review required');
  }
  const result = [];
  for (const name of names.sort()) {
    const file = path.join(folder, name);
    await noLinks(file);
    const stat = await fs.stat(file);
    if (!stat.isFile() || stat.nlink !== 1 || stat.size > 32768) throw Error('Unsafe registry entry');
    await ctx.ps('state-permissions.ps1', ['-Path', file, '-VerifyOnly']);
    const value = JSON.parse(await fs.readFile(file, 'utf8'));
    if (value?.id + '.json' !== name) throw Error('Registry ID mismatch');
    result.push(value);
  }
  return result;
}

export function validService(ctx, record) {
  try {
    return !!record && record.schema === 1 && validId(record.id) && /^[a-f0-9]{64}$/.test(record.capability) &&
      ['dev-server', 'test-worker', 'automation-controller'].includes(record.kind) &&
      /^[\p{L}\p{N}_. -]{1,80}$/u.test(record.serviceName) &&
      Number.isSafeInteger(record.identity?.pid) && record.identity.pid > 0 &&
      record.identity.name?.toLowerCase() === 'node.exe' &&
      typeof record.identity.path === 'string' && path.isAbsolute(record.identity.path) &&
      typeof record.identity.started === 'string' && Number.isFinite(Date.parse(record.identity.started)) &&
      typeof record.identity.ownerSid === 'string' && /^S-1-/.test(record.identity.ownerSid) &&
      typeof record.workspace === 'string' && normalized(record.workspace) === normalized(ctx.workspace) &&
      typeof record.entryPoint === 'string' && inside(ctx.workspace, record.entryPoint) &&
      Number.isFinite(Date.parse(record.registeredAt)) && Number.isFinite(Date.parse(record.expiresAt)) &&
      Number.isFinite(record.ttlMs) && record.ttlMs > 0 &&
      Date.parse(record.expiresAt) === Date.parse(record.registeredAt) + record.ttlMs &&
      Number.isFinite(record.idleMs) && record.idleMs >= 0;
  } catch { return false; }
}
