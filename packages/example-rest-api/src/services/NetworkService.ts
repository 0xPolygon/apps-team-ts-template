import { Cron } from 'croner';

import type { Logger } from '../logger.ts';

type FetchFn<T> = () => Promise<T>;

/**
 * Polls a fetch function on a fixed interval and caches the latest result.
 *
 * The first poll fires immediately in the constructor. `get()` returns the
 * cached value if available, awaits any in-flight poll, or triggers a fresh
 * poll when neither exists — so a failed initial poll does not leave the
 * service permanently broken until the next cron tick. Callers always either
 * receive data or the underlying fetch error.
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
    // No cached state and no active poll — e.g. the initial poll failed and
    // the next cron tick hasn't fired yet. Kick off a fresh poll on demand
    // so the caller either receives data or the underlying fetch error,
    // rather than a misleading "no data and no active poll" message.
    return this.poll();
  }

  stop(): void {
    this.job.stop();
  }
}
