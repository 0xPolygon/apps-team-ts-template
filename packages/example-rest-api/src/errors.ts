import type { ErrorRequestHandler } from 'express';

import { HTTPError } from '@polygonlabs/verror';

/**
 * Ethers v6 fetch errors (JsonRpcProvider, FallbackProvider, and anything
 * built on `ethers.FetchRequest`) embed the full request URL — including any
 * `?token=<secret>` query string — in three places: `err.message`,
 * `err.stack` (whose first line echoes the message), and `err.info.requestUrl`.
 *
 * If an RPC call fails during an HTTP request, that error propagates to the
 * Express error handler. Without sanitisation, the token lands in both the
 * response body (via `err.message`) and the application logs (via pino's
 * default err serialiser, which copies all three fields). Either leak makes
 * the token recoverable by whoever has access — the client, or whoever holds
 * the log backend.
 *
 * This module centralises the sanitisation so every route in a service built
 * from this template is covered without touching individual route handlers.
 * Extend the detector here when adopting a new RPC library that emits similar
 * errors.
 */

/** Reduce any URLs found in a string to their origin (protocol + host). */
function stripUrlsInPlace(text: string): string {
  return text.replace(/https?:\/\/[^\s"',)]+/g, (url) => {
    try {
      return new URL(url).origin;
    } catch {
      return '[redacted]';
    }
  });
}

function sanitiseInfo(info: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...info };
  if (typeof out.requestUrl === 'string') {
    try {
      out.requestUrl = new URL(out.requestUrl).origin;
    } catch {
      out.requestUrl = '[redacted]';
    }
  }
  return out;
}

/**
 * If `err` looks like an ethers v6 fetch error (has `info.requestUrl`),
 * returns a safe pair: one error instance for logging (message and stack
 * stripped of the leaky URL; `info.requestUrl` reduced to origin) and one
 * string for the HTTP response body. Returns `null` for any other shape of
 * error, letting the caller fall through to default handling.
 */
export function sanitiseEthersFetchError(
  err: unknown
): { forLog: Error; forResponse: string } | null {
  if (!(err instanceof Error)) return null;
  const withInfo = err as Error & { code?: string; info?: unknown; shortMessage?: string };
  if (!withInfo.info || typeof withInfo.info !== 'object' || !('requestUrl' in withInfo.info)) {
    return null;
  }

  const shortMessage = withInfo.shortMessage ?? 'RPC request failed';
  const safeInfo = sanitiseInfo(withInfo.info as Record<string, unknown>);

  const forLog = new Error(shortMessage);
  forLog.name = err.name;
  if (err.stack) forLog.stack = stripUrlsInPlace(err.stack);
  Object.assign(forLog, { code: withInfo.code, info: safeInfo });

  return { forLog, forResponse: shortMessage };
}

/**
 * Global Express error handler. Must be mounted last, after all routes.
 * Typed as `ErrorRequestHandler` so Express recognises the 4-argument shape
 * as error-handling middleware.
 */
export function createErrorHandler(): ErrorRequestHandler {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  return (err, req, res, _next) => {
    const sanitised = sanitiseEthersFetchError(err);

    const status = err instanceof HTTPError ? err.statusCode : 500;
    const forLog = sanitised?.forLog ?? err;

    if (status >= 500) {
      req.log.debug({ err: forLog }, 'unhandled error');
    }

    const message =
      sanitised?.forResponse ?? (err instanceof Error ? err.message : 'Internal server error');

    res.status(status).json({ error: true, message });
  };
}
