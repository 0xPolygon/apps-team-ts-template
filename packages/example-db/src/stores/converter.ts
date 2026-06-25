import type {
  DocumentData,
  FirestoreDataConverter,
  QueryDocumentSnapshot,
  WithFieldValue
} from '@google-cloud/firestore';
import type { ZodType } from 'zod';

/**
 * Wraps a Zod schema as a Firestore data converter so every document read
 * through the collection is parsed and typed at the boundary — a malformed
 * document fails loudly here rather than several frames later. Attach via
 * `collection.withConverter(zodConverter(MySchema))`.
 *
 * `snap.id` is merged into the parsed object so schemas carrying an `id` field
 * are satisfied even when the id lives only in the document key (not duplicated
 * in the body). Schemas without an `id` field simply strip it.
 */
export function zodConverter<T>(schema: ZodType<T>): FirestoreDataConverter<T> {
  return {
    toFirestore: (data: WithFieldValue<T>) => data as DocumentData,
    fromFirestore: (snap: QueryDocumentSnapshot): T => schema.parse({ id: snap.id, ...snap.data() })
  };
}
