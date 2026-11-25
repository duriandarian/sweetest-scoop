export const GAME_REQUEST_TIMEOUT_MS = 4_000;

/** Bound the whole request, including reading the response body. */
export async function withRequestDeadline<T>(
  send: (signal: AbortSignal) => Promise<T>,
  timeoutMs = GAME_REQUEST_TIMEOUT_MS,
  upstream?: AbortSignal,
): Promise<T> {
  if (upstream?.aborted) throw upstream.reason;
  const controller = new AbortController();
  let timeout: ReturnType<typeof setTimeout> | undefined;
  let cancel: (() => void) | undefined;
  try {
    return await Promise.race([
      new Promise<never>((_, reject) => {
        const finish = (reason: unknown) => {
          reject(reason);
          controller.abort(reason);
        };
        cancel = () => finish(upstream?.reason);
        upstream?.addEventListener('abort', cancel, { once: true });
        timeout = setTimeout(() => finish(new DOMException('Game request timed out', 'TimeoutError')), timeoutMs);
      }),
      Promise.resolve().then(() => {
        controller.signal.throwIfAborted();
        return send(controller.signal);
      }),
    ]);
  } finally {
    clearTimeout(timeout);
    if (cancel) upstream?.removeEventListener('abort', cancel);
  }
}
