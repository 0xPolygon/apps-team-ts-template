/**
 * Prod smoke — liveness endpoint.
 *
 * The 200 body is validated against `HealthCheckResponse`, the same Zod schema
 * the route registers, so any envelope drift on the deployed instance fails as
 * a Zod parse error with full field paths.
 */
import { describe, expect, it } from 'vitest';

import { HealthCheckResponse } from '@polygonlabs/example-schemas';

import { parse, shouldRun, smokeAgent } from './agent.ts';

describe.skipIf(!shouldRun)('example-rest-api prod smoke — /health-check', () => {
  it('returns 200 with the documented HealthCheckResponse envelope', async () => {
    const res = await smokeAgent().get('/health-check');

    expect(res).property('status', 200);
    const body = parse(HealthCheckResponse, res.body);
    expect(body.success).equal(true);
  });
});
