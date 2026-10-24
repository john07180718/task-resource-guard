import test from 'node:test';
import assert from 'node:assert/strict';
import { withOwnedResource } from '../skills/task-resource-guard/scripts/owned-resource.mjs';

test('work and close are both awaited, and successful result survives', async () => {
  const events = [];
  let finishWork, finishClose;
  const workDone = new Promise(resolve => { finishWork = resolve; });
  const closeDone = new Promise(resolve => { finishClose = resolve; });
  let settled = false;
  const task = withOwnedResource({
    create: () => ({ private: true }),
    close: async handle => { assert.equal(handle.private, true); events.push('close'); await closeDone; },
  }, async () => { events.push('work'); await workDone; return 42; }).then(value => { settled = true; return value; });
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(events, ['work']);
  finishWork();
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(events, ['work', 'close']);
  assert.equal(settled, false);
  finishClose();
  assert.equal(await task, 42);
});

test('failed work still closes exactly once and preserves the original error', async () => {
  const error = Error('synthetic work failure');
  let count = 0;
  await assert.rejects(withOwnedResource({ create: () => ({}), close: () => { count++; } }, () => { throw error; }), actual => actual === error);
  assert.equal(count, 1);
});

test('two failures are retained, and a failed factory does not guess a resource', async () => {
  const workError = Error('work'), closeError = Error('close'), createError = Error('create');
  await assert.rejects(withOwnedResource({ create: () => ({}), close: () => { throw closeError; } }, () => { throw workError; }),
    error => error instanceof AggregateError && error.errors[0] === workError && error.errors[1] === closeError);
  await assert.rejects(withOwnedResource({ create: () => { throw createError; }, close: () => assert.fail('no handle exists') }, () => assert.fail('no work')),
    error => error === createError);
});

test('failed close cannot be mistaken for success; even falsy work errors survive', async () => {
  const error = Error('close');
  await assert.rejects(withOwnedResource({ create: () => ({}), close: () => { throw error; } }, () => 1), actual => actual === error);
  let caught = false;
  try { await withOwnedResource({ create: () => ({}), close: () => {} }, () => { throw undefined; }); }
  catch (actual) { caught = true; assert.equal(actual, undefined); }
  assert.equal(caught, true);
});
