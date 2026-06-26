import type { z } from 'zod';

/**
 * Supertest agent + schema parser for the prod-smoke tier.
 *
 * The base URL is the DEPLOYED instance to smoke, read from `SMOKE_BASE_URL`.
 * A real, deployed service either bakes its per-environment hosts into a
 * `SMOKE_TARGET` → URL map (see `lst-api`) or injects the URL per environment;
 * the `test:prod-smoke` / `test:dev-smoke` scripts here take the latter path,
 * mapping `SMOKE_PROD_URL` / `SMOKE_DEV_URL` onto `SMOKE_BASE_URL`.
 *
 * `example-rest-api` is the template and is NOT deployed, so `SMOKE_BASE_URL`
 * is unset by default and every prod-smoke suite SKIPS (`describe.skipIf`) —
 * the tier is safe to commit, never runs in CI (it's excluded from the default
 * config), and a developer copying the template gets the pattern without a live
 * target. Point it at a real host to exercise it.
 */
import request from 'supertest';

export const baseUrl = process.env['SMOKE_BASE_URL'];

/** Gate for `describe.skipIf(!shouldRun)` — true only when a target is set. */
export const shouldRun = Boolean(baseUrl);

let _agent: ReturnType<typeof request.agent> | undefined;

/**
 * The supertest agent bound to `baseUrl`, built lazily on first use. Lazy
 * because this module is imported even when the suite is skipped (Vitest
 * evaluates the file before applying `skipIf`); constructing an agent against
 * an unset/`http` base URL must not happen at import time. Only the test
 * bodies — which run only when `shouldRun` is true — call this.
 */
export function smokeAgent(): ReturnType<typeof request.agent> {
  if (baseUrl === undefined) throw new Error('SMOKE_BASE_URL is not set');
  if (!baseUrl.startsWith('https://')) throw new Error('SMOKE_BASE_URL must use HTTPS');
  // Cloudflare drops requests without a User-Agent; set one on every request.
  return (_agent ??= request.agent(baseUrl).set('User-Agent', 'example-rest-api-prod-smoke/1.0'));
}

/**
 * Parse `body` against `schema` with `reportInput: true` so a schema-validation
 * failure includes the actual offending value (`issue.input`), not just a
 * `received: 'number'` typeof descriptor. Critical for smoke triage: when a
 * deploy starts returning the wrong field, the failure tells you what the value
 * was, not only what type it was.
 */
export function parse<T>(schema: z.ZodType<T>, body: unknown): T {
  return schema.parse(body, { reportInput: true });
}
