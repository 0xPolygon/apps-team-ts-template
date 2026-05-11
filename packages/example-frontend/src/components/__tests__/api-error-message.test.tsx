// Pins the canonical-narrowing pattern at compile time AND runtime.
//
// What this proves:
//   - Component code calls only the per-client predicates exported
//     from `@polygonlabs/example-client` — no `instanceof`, no
//     magic-string `_tag` checks, no casts.
//   - Each fixture below produces a value structurally identical to
//     what a real generated wrapper would emit for that category.
//     The component renders the right copy without any type hints.
//   - The `data-error-category` attribute carries the discriminator
//     verbatim, so production telemetry (Sentry tagging via
//     `lib/report-api-error.ts`) and Playwright tests can route on
//     it without scraping copy.

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ZodError } from 'zod';

import { TransportError, UnknownError } from '@polygonlabs/example-client';

import { ApiErrorMessage } from '../api-error-message';

describe('<ApiErrorMessage />', () => {
  it('renders transport copy when given a TransportError', () => {
    const fetchError = new TypeError('fetch failed');
    render(<ApiErrorMessage error={new TransportError(fetchError)} />);
    const box = screen.getByTestId('api-error');
    expect(box.dataset.errorCategory).toBe('transport');
    expect(screen.getByTestId('api-error-detail').textContent).toContain('fetch failed');
  });

  it('renders unknown copy (without leaking the wire body) when given an UnknownError', () => {
    const issues = new ZodError([
      // Real ZodIssue shape — confirms the component reads cause
      // structurally without casts.
      {
        code: 'invalid_type',
        path: ['code'],
        message: 'expected string',
        expected: 'string',
        input: 42
      }
    ]);
    // Use a wire-body shape with values not present in the UI copy
    // so the "doesn't leak body" assertion can't pass spuriously
    // because the copy happens to contain the same words.
    const wireBody = { rawTraceId: 'abc-trace-XYZ-9999', stackHint: 'INTERNAL_PANIC' };
    render(<ApiErrorMessage error={new UnknownError(issues, wireBody)} />);
    const box = screen.getByTestId('api-error');
    expect(box.dataset.errorCategory).toBe('unknown');
    // Body is engineering-only — Sentry adapter records it; the UI
    // doesn't expose it.
    expect(box.textContent ?? '').not.toContain('abc-trace');
    expect(box.textContent ?? '').not.toContain('INTERNAL_PANIC');
  });

  it('renders native-error copy when given a raw Error (e.g. factory queryFn rejection)', () => {
    render(<ApiErrorMessage error={new TypeError('signal aborted')} />);
    const box = screen.getByTestId('api-error');
    expect(box.dataset.errorCategory).toBe('native-error');
    expect(screen.getByTestId('api-error-detail').textContent).toContain('signal aborted');
  });

  it('renders typed-error copy for `{ code, message }` shapes (typed `${Op}Error`)', () => {
    // After the consumer narrows past the wrapper-error branches,
    // the residual is the typed `${Op}Error`. The component reads
    // `.message` / `.code` directly — no casts, no schema imports
    // at this layer.
    const typed = { code: 'not_found', message: 'No such resource', resourceId: 'order_42' };
    render(<ApiErrorMessage error={typed} />);
    const box = screen.getByTestId('api-error');
    expect(box.dataset.errorCategory).toBe('typed');
    expect(screen.getByTestId('api-error-headline').textContent).toBe('No such resource');
    expect(screen.getByTestId('api-error-detail').textContent).toContain('not_found');
  });

  it('renders the unrecognised fallback for non-Error, non-typed shapes', () => {
    render(<ApiErrorMessage error={{ random: 'shape' }} />);
    expect(screen.getByTestId('api-error').dataset.errorCategory).toBe('unrecognised');
  });

  it('honours a custom testId so multiple instances on a page can be selected independently', () => {
    render(<ApiErrorMessage testId="block-number-error" error={new Error('oops')} />);
    expect(screen.getByTestId('block-number-error').dataset.errorCategory).toBe('native-error');
    expect(screen.getByTestId('block-number-error-detail').textContent).toContain('oops');
  });
});
