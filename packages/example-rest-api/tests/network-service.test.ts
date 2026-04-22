import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Logger } from '../src/logger.ts';

import { NetworkService } from '../src/services/NetworkService.ts';

const silentLogger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {}
} as unknown as Logger;

describe('NetworkService', () => {
  let service: NetworkService<number> | null = null;

  afterEach(() => {
    service?.stop();
    service = null;
  });

  it('returns cached state once the initial poll resolves', async () => {
    const fetchFn = vi.fn().mockResolvedValue(42);
    service = new NetworkService(fetchFn, 30, 'test', silentLogger);

    const value = await service.get();
    expect(value).equal(42);
    expect(fetchFn).property('mock').nested.property('calls.length', 1);
  });

  it('re-polls on demand when the initial poll has failed and no poll is in flight', async () => {
    const fetchFn = vi
      .fn<() => Promise<number>>()
      .mockRejectedValueOnce(new Error('rpc down'))
      .mockResolvedValueOnce(7);

    service = new NetworkService(fetchFn, 30, 'test', silentLogger);

    // Yield twice so the constructor's initial poll settles AND its .finally
    // runs — at which point `state` is still null and `activePoll` is null.
    await Promise.resolve();
    await Promise.resolve();

    const value = await service.get();
    expect(value).equal(7);
    expect(fetchFn).property('mock').nested.property('calls.length', 2);
  });

  it('propagates the underlying fetch error when both the initial and on-demand poll fail', async () => {
    const fetchFn = vi
      .fn<() => Promise<number>>()
      .mockRejectedValueOnce(new Error('first fail'))
      .mockRejectedValueOnce(new Error('second fail'));

    service = new NetworkService(fetchFn, 30, 'test', silentLogger);
    await Promise.resolve();
    await Promise.resolve();

    await expect(service.get()).rejects.property('message', 'second fail');
  });
});
