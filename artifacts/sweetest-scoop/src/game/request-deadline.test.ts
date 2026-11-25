import assert from 'node:assert/strict';
import { test } from 'node:test';
import { withRequestDeadline } from './request-deadline';

test('returns a completed request and removes its cancellation listener', async () => {
  const upstream = new AbortController();
  let requestSignal: AbortSignal | undefined;
  assert.equal(await withRequestDeadline(async signal => {
    requestSignal = signal;
    return 'saved';
  }, 100, upstream.signal), 'saved');
  upstream.abort();
  assert.equal(requestSignal?.aborted, false);
});

test('unblocks the caller and aborts transport even if a request never settles', async () => {
  let requestSignal: AbortSignal | undefined;
  const request = withRequestDeadline(signal => {
    requestSignal = signal;
    return new Promise<never>(() => {});
  }, 10);
  await assert.rejects(request, { name: 'TimeoutError' });
  assert.equal(requestSignal?.aborted, true);
});

test('cancels an in-flight poll when superseded, and does not send if already cancelled', async () => {
  const upstream = new AbortController();
  let requestSignal: AbortSignal | undefined;
  const request = withRequestDeadline(signal => {
    requestSignal = signal;
    return new Promise<never>(() => {});
  }, 100, upstream.signal);
  await Promise.resolve();
  upstream.abort();
  await assert.rejects(request, { name: 'AbortError' });
  assert.equal(requestSignal?.aborted, true);
  await assert.rejects(withRequestDeadline(() => assert.fail('sent a cancelled request'), 100, upstream.signal), { name: 'AbortError' });
});
