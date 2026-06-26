/**
 * Prod smoke — GET /events (the indexer→db→REST read path).
 *
 * The 200 body is validated against `EventList` — the same Zod schema the route
 * serves — so any drift in the event projection or the pagination envelope on
 * the deployed instance fails as a Zod parse error with full field paths, not a
 * bare status assertion.
 */
import { describe, expect, it } from 'vitest';

import { EventList } from '@polygonlabs/example-schemas';

import { parse, shouldRun, smokeAgent } from './agent.ts';

describe.skipIf(!shouldRun)('example-rest-api prod smoke — /events', () => {
  it('returns 200 with the documented EventList envelope', async () => {
    const res = await smokeAgent().get('/events');

    expect(res).property('status', 200);
    const body = parse(EventList, res.body);
    expect(body.items).to.be.an('array');
  });

  it('honours the limit filter and stays within the documented envelope', async () => {
    const res = await smokeAgent().get('/events').query({ limit: 5 });

    expect(res).property('status', 200);
    const body = parse(EventList, res.body);
    expect(body.items.length).most(5);
  });
});
