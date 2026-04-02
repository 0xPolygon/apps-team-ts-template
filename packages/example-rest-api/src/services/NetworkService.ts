import { Cron } from 'croner';

import type { Logger } from '../logger.ts';

type FetchFn<T> = () => Promise<T>;

/**
 * Polls a fetch function on a fixed interval and caches the latest result.
 *
 * The first poll fires immediately in the constructor. `get()` returns the
 * cached value if available, or awaits the in-flight poll — so the first call
 * to `get()` naturally waits for the initial fetch to complete rather than
 * returning null or throwing.
 */
export class NetworkService<T> {
  private state: T | null = null;
  private activePoll: Promise<T> | null = null;
  private readonly job: Cron;
  private readonly fetchFn: FetchFn<T>;
  private readonly label: string;

  constructor(fetchFn: FetchFn<T>, intervalSecs: number, label: string, logger: Logger) {
    this.fetchFn = fetchFn;
    this.label = label;
    // Suppress the rejection on the initial poll — no croner catch handler is
    // active yet and no get() caller has attached to activePoll. Subsequent
    // polls run inside croner, which catches and logs rejections via the catch
    // option below.
    this.poll().catch(() => {});

    this.job = new Cron(
      `*/${intervalSecs} * * * * *`,
      {
        protect: true,
        unref: true,
        catch: (err: unknown) => logger.error({ err, label: this.label }, 'poll failed')
      },
      () => this.poll().then(() => {})
    );
  }

  private poll(): Promise<T> {
    const p = this.fetchFn()
      .then((result) => {
        this.state = result;
        return result;
      })
      .finally(() => {
        if (this.activePoll === p) this.activePoll = null;
      });
    this.activePoll = p;
    return p;
  }

  async get(): Promise<T> {
    if (this.state !== null) return this.state;
    if (this.activePoll !== null) return this.activePoll;
    throw new Error(`NetworkService "${this.label}" has no data and no active poll`);
  }

  stop(): void {
    this.job.stop();
  }
}
