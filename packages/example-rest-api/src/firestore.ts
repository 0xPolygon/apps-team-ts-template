import { Firestore } from '@google-cloud/firestore';

import { getEnv } from './env.ts';

/**
 * Builds the Firestore client.
 *
 * The `@google-cloud/firestore` SDK auto-detects `FIRESTORE_EMULATOR_HOST`
 * from the environment: when it's set (the integration suite, via
 * vitest.globalSetup) every read/write is routed to the local emulator with
 * NO credentials — which is the whole point of a `demo-*` project id, a
 * value the emulator treats as credential-free. In production the host var
 * is absent and the same client uses Application Default Credentials against
 * the real GOOGLE_CLOUD_PROJECT_ID.
 *
 * `universeDomain` is pinned so the gRPC client skips the GCE metadata probe
 * it would otherwise run to discover the domain — that probe fails off-GCP
 * (local + emulator) and emits a noisy MetadataLookupWarning. Copied from
 * pos-airdrop, where the same warning surfaced first.
 *
 * `ignoreUndefinedProperties` lets writes omit absent optional fields rather
 * than rejecting an `undefined` value.
 */
export function createFirestore(): Firestore {
  const db = new Firestore({
    projectId: getEnv().GOOGLE_CLOUD_PROJECT_ID,
    universeDomain: 'googleapis.com'
  });
  db.settings({ ignoreUndefinedProperties: true });
  return db;
}
