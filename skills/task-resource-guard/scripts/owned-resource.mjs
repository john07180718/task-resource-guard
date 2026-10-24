// Only newly created task-private handles belong in this scope.
export async function withOwnedResource({ create, close }, work) {
  if (typeof create !== 'function' || typeof close !== 'function' || typeof work !== 'function') {
    throw new TypeError('create, close and work callbacks are required');
  }
  const resource = await create();
  let value, workError, failed = false;
  try {
    value = await work(resource);
  } catch (error) {
    failed = true;
    workError = error;
  }
  try {
    // Await actual work and close; a timeout is not evidence of completion.
    await close(resource);
  } catch (closeError) {
    if (failed) throw new AggregateError([workError, closeError], 'Work and normal resource close both failed');
    throw closeError;
  }
  if (failed) throw workError;
  return value;
}
