// Tests the Sentry adapter's category → tag mapping.
//
// `reportApiError` is the canonical use case for the cross-client
// `categorizeApiError` helper from
// `@polygonlabs/zod-to-openapi-heyapi/errors`: a logging adapter
// that doesn't need per-op typed narrowing — it just wants a stable
// category tag on every Sentry event so dashboards can split
// transport / schema-mismatch / native / typed cleanly.
//
// The test mocks `@sentry/react`'s `withScope` / `captureException`
// / `captureMessage` and asserts the right tag fires for each
// category. Sentry itself isn't initialised in tests, so this
// verifies the wiring without needing a Sentry endpoint.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { ZodError } from 'zod';

import { ResponseValidationError, TransportError } from '@polygonlabs/example-client';

vi.mock('@sentry/react', () => {
  // Recorded calls; each test inspects them via `mocks.*` then
  // resets in `afterEach`.
  const calls = {
    withScope: [] as Array<(scope: ScopeMock) => unknown>,
    captureException: [] as Array<{ error: unknown; options?: unknown }>,
    captureMessage: [] as Array<{ message: string; options?: unknown }>,
    setTag: [] as Array<{ key: string; value: string }>,
    setContext: [] as Array<{ key: string; ctx: Record<string, unknown> }>
  };
  interface ScopeMock {
    setTag(key: string, value: string): void;
    setContext(key: string, ctx: Record<string, unknown>): void;
  }
  const scope: ScopeMock = {
    setTag: (key, value) => {
      calls.setTag.push({ key, value });
    },
    setContext: (key, ctx) => {
      calls.setContext.push({ key, ctx });
    }
  };
  return {
    __mocks: calls,
    withScope: (fn: (s: ScopeMock) => unknown) => {
      calls.withScope.push(fn);
      return fn(scope);
    },
    captureException: (error: unknown, options?: unknown) => {
      calls.captureException.push({ error, options });
      return 'event-id-exception';
    },
    captureMessage: (message: string, options?: unknown) => {
      calls.captureMessage.push({ message, options });
      return 'event-id-message';
    }
  };
});

// Pull the typed handle to the recorded calls. Module factories
// don't preserve named exports for direct import, so we reach via
// the dynamic import side.
import * as SentryMock from '@sentry/react';

import { reportApiError } from '../report-api-error';
const mocks = (SentryMock as unknown as { __mocks: MockCalls }).__mocks;

interface MockCalls {
  withScope: Array<unknown>;
  captureException: Array<{ error: unknown; options?: unknown }>;
  captureMessage: Array<{ message: string; options?: unknown }>;
  setTag: Array<{ key: string; value: string }>;
  setContext: Array<{ key: string; ctx: Record<string, unknown> }>;
}

afterEach(() => {
  mocks.withScope.length = 0;
  mocks.captureException.length = 0;
  mocks.captureMessage.length = 0;
  mocks.setTag.length = 0;
  mocks.setContext.length = 0;
});

describe('reportApiError', () => {
  it('tags transport errors with kind=transport and captures the underlying fetch error', () => {
    const fetchError = new TypeError('fetch failed');
    reportApiError(new TransportError(fetchError), { operation: 'getX' });
    expect(mocks.setTag).toContainEqual({ key: 'api.error.kind', value: 'transport' });
    expect(mocks.setTag).toContainEqual({ key: 'api.operation', value: 'getX' });
    // The captured exception is the underlying fetch error so the
    // Sentry stack trace points at the network layer, not at our
    // wrapper class.
    expect(mocks.captureException[0]?.error).toBe(fetchError);
  });

  it('tags response-validation errors with kind=response-validation and attaches body + issues as Sentry context', () => {
    const issues = new ZodError([
      {
        code: 'invalid_type',
        path: ['code'],
        message: 'expected string',
        expected: 'string',
        input: 42
      }
    ]);
    const wireBody = { unexpected: 'shape' };
    const err = new ResponseValidationError(issues, wireBody);
    reportApiError(err);
    expect(mocks.setTag).toContainEqual({
      key: 'api.error.kind',
      value: 'response-validation'
    });
    // Engineering payload — body and Zod issues — lands as Sentry
    // context, not in the message string.
    const ctx = mocks.setContext.find((c) => c.key === 'api.response-validation');
    expect(ctx?.ctx.body).toEqual(wireBody);
    expect(ctx?.ctx.issues).toEqual(issues.issues);
  });

  it('tags raw native Errors (factory bypass path) with kind=native-error', () => {
    const native = new TypeError('signal aborted');
    reportApiError(native);
    expect(mocks.setTag).toContainEqual({ key: 'api.error.kind', value: 'native-error' });
    expect(mocks.captureException[0]?.error).toBe(native);
  });

  it('captures unrecognised shapes via captureMessage with kind=other', () => {
    reportApiError({ random: 'shape' });
    expect(mocks.setTag).toContainEqual({ key: 'api.error.kind', value: 'other' });
    expect(mocks.captureMessage[0]?.message).toBe('Unrecognised API error shape');
  });
});
