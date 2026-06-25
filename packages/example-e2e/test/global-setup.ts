/**
 * Vitest global setup for the e2e suite. Single responsibility: bring up the
 * Firestore emulator declared in this package's docker-compose.yml if one isn't
 * already running, and tear it down after.
 *
 * The kurtosis-pos devnet (bor on 127.0.0.1:9545) is NOT managed here — it's
 * restored out-of-band by `scripts/restore-e2e-snapshot.sh` (invoked by
 * `scripts/run-e2e.sh` or CI), because restoring a multi-container devnet has
 * nothing to do with this suite's persistence layer. The suite's
 * `getDevnetClients()` simply assumes bor is up.
 *
 * Skipped when `FIRESTORE_EMULATOR_HOST` is already set — an external bring-up
 * (CI, or a developer) owns the emulator in that case.
 */
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const packageDir = join(import.meta.dirname, '..');
const emulatorAlreadyRunning = !!process.env['FIRESTORE_EMULATOR_HOST'];

export function setup(): void {
  if (!emulatorAlreadyRunning) {
    spawnSync('docker', ['compose', 'up', '-d', '--wait'], {
      cwd: packageDir,
      stdio: 'inherit'
    });
  }
}

export function teardown(): void {
  if (!emulatorAlreadyRunning) {
    spawnSync('docker', ['compose', 'down'], {
      cwd: packageDir,
      stdio: 'inherit'
    });
  }
}
