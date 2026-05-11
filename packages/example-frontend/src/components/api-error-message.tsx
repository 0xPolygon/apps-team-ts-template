/**
 * Renders an error from a typed-client call (imperative wrapper or
 * TanStack hook) with category-specific copy.
 *
 * Demonstrates the **canonical narrowing pattern** the codec-aware
 * SDK wrapper enables. The wrapper return is statically widened to
 * `${Op}Error | TransportError | UnknownError | undefined`; the
 * component peels off the wrapper-error categories with the type-
 * predicate guards re-exported from `@polygonlabs/example-client`,
 * and TS flow-narrows the rest:
 *
 *   - `isTransportError(error)` → `error.cause` is `Error`. No cast.
 *   - `isUnknownError(error)` → `error.body` is `unknown`,
 *     `error.cause.issues` is the Zod issue array. No cast.
 *   - Otherwise → typed `${Op}Error` (when called from a typed
 *     wrapper return) or `Error | unknown` (when called from a hook
 *     where TanStack defaults TError to `Error`). Either way the
 *     `.message` field is accessible because we only render
 *     `error.message`-style copy at this level — per-op narrowing
 *     (e.g. `if (error.code === 'not_found')`) is the caller's job.
 *
 * **No `as` casts. No type hints at the use site.** The category-
 * specific copy is opinionated for the example app; real apps
 * should fork the copy decisions to match their UX (i18n, retry
 * affordances, links to support, etc.).
 *
 * Stable `data-error-category` attribute lets Playwright tests
 * assert the right category surfaced without scraping copy.
 */

import { isTransportError, isUnknownError } from '@polygonlabs/example-client';

export interface ApiErrorMessageProps {
  /** Anything caught from a typed-client call. */
  readonly error: unknown;
  /** Optional override for the test-id namespace. */
  readonly testId?: string;
}

export const ApiErrorMessage = ({ error, testId = 'api-error' }: ApiErrorMessageProps) => {
  if (isTransportError(error)) {
    return (
      <ErrorBox
        testId={testId}
        category="transport"
        headline="We couldn't reach the server"
        detail={`Network error: ${error.cause.message}. Please check your connection and retry.`}
      />
    );
  }
  if (isUnknownError(error)) {
    // Wire body + Zod issues are the engineering payload — the
    // Sentry adapter (see `lib/report-api-error.ts`) already records
    // them on the captured event, so the user-facing copy stays
    // generic. Don't expose the body in the UI.
    return (
      <ErrorBox
        testId={testId}
        category="unknown"
        headline="The server returned an unexpected response"
        detail="We've been notified and are looking into it. Please try again shortly."
      />
    );
  }
  if (error instanceof Error) {
    // Native `Error` from a non-wrapper code path (most commonly the
    // codec-aware TanStack Query factory's queryFn rejecting from
    // the raw SDK with `throwOnError: true`). Functionally identical
    // to a transport failure for the user's purposes.
    return (
      <ErrorBox
        testId={testId}
        category="native-error"
        headline="We couldn't reach the server"
        detail={`Network error: ${error.message}. Please check your connection and retry.`}
      />
    );
  }
  // Typed `${Op}Error` (when called from a typed wrapper return —
  // narrowed by TS flow analysis) or anything else. The example
  // schemas all expose `code` + `message`; specific apps should
  // branch on `code` for op-specific copy.
  if (
    error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return (
      <ErrorBox
        testId={testId}
        category="typed"
        headline={error.message}
        detail={'code' in error && typeof error.code === 'string' ? `Code: ${error.code}` : ''}
      />
    );
  }
  return (
    <ErrorBox
      testId={testId}
      category="unrecognised"
      headline="Something went wrong"
      detail="An unexpected error occurred."
    />
  );
};

interface ErrorBoxProps {
  readonly testId: string;
  readonly category: 'transport' | 'unknown' | 'native-error' | 'typed' | 'unrecognised';
  readonly headline: string;
  readonly detail: string;
}

const ErrorBox = ({ testId, category, headline, detail }: ErrorBoxProps) => (
  <div
    data-testid={testId}
    data-error-category={category}
    role="alert"
    className="rounded border border-red-200 bg-red-50 p-2 text-sm text-red-900"
  >
    <p data-testid={`${testId}-headline`} className="font-medium">
      {headline}
    </p>
    {detail ? (
      <p data-testid={`${testId}-detail`} className="text-red-800">
        {detail}
      </p>
    ) : null}
  </div>
);
