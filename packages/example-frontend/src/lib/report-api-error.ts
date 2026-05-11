/**
 * Sentry adapter for errors surfaced by the codec-aware SDK
 * wrappers.
 *
 * Demonstrates the canonical use case for the cross-client `/errors`
 * subpath of `@polygonlabs/zod-to-openapi-heyapi`: a logging adapter
 * that doesn't need per-op typed error narrowing — it just wants to
 * tag the Sentry event by category so incident metrics can split
 * transport / schema-mismatch / native / typed cleanly. Per-op
 * typing isn't useful here because Sentry doesn't care which
 * operation produced the error; it cares about the *kind* of
 * failure for retry-policy / paging / dashboard purposes.
 *
 * Key design choices:
 *
 *   - Uses `categorizeApiError` from the plugin's `/errors` subpath
 *     so this code stays cross-client (works with any SDK generated
 *     by `zod-to-openapi-heyapi`, not just `@polygonlabs/example-client`).
 *   - Sets a `api.error.kind` tag with the discriminator value, so
 *     Sentry alerts and dashboards can filter by category without
 *     parsing the message string.
 *   - Attaches the `ResponseValidationError.body` (wire body) and `cause.issues`
 *     (Zod parse issues) as a Sentry context — that's exactly the
 *     debugging payload an engineer triaging schema drift needs, and
 *     it isn't visible from the Sentry message alone.
 *   - For `transport` and `native-error`, captures the underlying
 *     fetch error as the Sentry exception so the stack trace points
 *     at the network layer, not at our wrapper class.
 *   - For `other` (unknown shape — typed `${Op}Error` values from
 *     code paths that don't have the wrapper return type in scope),
 *     captures with a generic message so Sentry still sees the
 *     event, but tagged so dashboards can route it.
 */

// `@sentry/react` re-exports `captureException` / `captureMessage` /
// `withScope` via `export * from '@sentry/browser'`. The wildcard is
// honoured at runtime, but TS's `import { ... } from '@sentry/react'`
// doesn't always pick up the re-exports through the `typesVersions`
// chain — depends on how the consumer's tsconfig resolves the
// package. Namespace import + a typed shim is the resolution-stable
// pattern; the symbols are guaranteed to exist at runtime.
import * as Sentry from '@sentry/react';

import { categorizeApiError } from '@polygonlabs/zod-to-openapi-heyapi/errors';

interface SentryScopeLike {
  setTag(key: string, value: string): void;
  setContext(key: string, ctx: Record<string, unknown>): void;
}
interface SentryCaptureOptions {
  level?: 'error';
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
}
interface SentryShim {
  withScope(fn: (scope: SentryScopeLike) => string | undefined): string | undefined;
  captureException(error: unknown, options?: SentryCaptureOptions): string;
  captureMessage(message: string, options?: SentryCaptureOptions): string;
}
const sentry = Sentry as unknown as SentryShim;
const { captureException, captureMessage, withScope } = sentry;

/**
 * Capture an API error to Sentry with a category tag.
 *
 * Returns the Sentry event ID (or `undefined` if Sentry isn't
 * initialised) so callers can correlate UI toast IDs with the
 * server-side event for support tickets.
 */
export function reportApiError(
  error: unknown,
  context?: { readonly operation?: string; readonly extra?: Record<string, unknown> }
): string | undefined {
  const category = categorizeApiError(error);
  return withScope((scope) => {
    scope.setTag('api.error.kind', category.kind);
    if (context?.operation) scope.setTag('api.operation', context.operation);
    if (context?.extra) scope.setContext('api.extra', context.extra);

    switch (category.kind) {
      case 'transport':
        // Capture the underlying fetch error so the stack trace
        // points at the network layer instead of the wrapper.
        return captureException(category.error.cause, {
          tags: { 'api.error.cause.kind': 'native-fetch' }
        });

      case 'response-validation':
        // Schema drift — the wire body and Zod issues are the
        // payload a triaging engineer actually needs.
        scope.setContext('api.response-validation', {
          body: category.error.body,
          issues: category.error.cause.issues
        });
        return captureException(category.error);

      case 'native-error':
        // Most commonly the codec-aware TanStack Query factory's
        // `queryFn` rejecting from the raw SDK with a fetch error.
        // Functionally identical to `transport` from the user's
        // perspective; Sentry sees them separately for telemetry.
        return captureException(category.error);

      case 'other':
        // Unknown shape — typed `${Op}Error` values from code paths
        // that don't have the wrapper return type in scope, plus
        // anything else. Capture as a Sentry message so the event
        // still lands; the tag gives dashboards routing.
        return captureMessage('Unrecognised API error shape', {
          level: 'error',
          extra: { value: safeStringify(category.error) }
        });
    }
  });
}

/**
 * Stringify a value for Sentry's `extra` payload without throwing
 * on circular references or unserialisable values (bigint, symbol).
 * Falls back to a tagged placeholder when stringify fails.
 */
function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value, (_key, v) => (typeof v === 'bigint' ? `${v.toString()}n` : v), 2);
  } catch {
    return `[unserialisable: ${typeof value}]`;
  }
}
