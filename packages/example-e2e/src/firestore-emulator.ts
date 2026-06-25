/**
 * Points the Firestore SDK at the local emulator and clears it between runs.
 * The emulator container itself is managed by `test/global-setup.ts` (or an
 * external bring-up); this module only configures the SDK env and wipes state.
 */
export const EMULATOR_HOST = process.env['FIRESTORE_EMULATOR_HOST'] ?? '127.0.0.1:8080';
export const PROJECT_ID = 'demo-example-indexer';

/**
 * Idempotently set the env vars the `@google-cloud/firestore` SDK keys off to
 * talk to the emulator instead of production. Call before constructing any
 * Firestore client — including the indexer's, via `initializeServices`.
 */
export function useFirestoreEmulator(): void {
  process.env['FIRESTORE_EMULATOR_HOST'] = EMULATOR_HOST;
  process.env['GOOGLE_CLOUD_PROJECT_ID'] = PROJECT_ID;
}

/**
 * Wipe every document from the emulator's default database via its
 * undocumented-but-supported `DELETE /emulator/v1/...` endpoint — faster than
 * iterating collections from the SDK and survives schema changes.
 */
export async function clearFirestore(): Promise<void> {
  const res = await fetch(
    `http://${EMULATOR_HOST}/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`,
    { method: 'DELETE' }
  );
  if (!res.ok) {
    throw new Error(`Failed to clear Firestore emulator: ${res.status} ${res.statusText}`);
  }
}
