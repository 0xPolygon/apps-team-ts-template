/**
 * End-to-end codec round-trip demo for the registry-driven service stack.
 *
 * Exercises the four codec scenarios the example-rest-api ships:
 *
 * - **`Int64Codec` on a response field** — `getBlockNumber` returns
 *   `{ blockNumber }` where the wire shape is a digit string but the
 *   typed client decodes it to a `bigint` via the response transformer
 *   the `@polygonlabs/zod-to-openapi-heyapi` plugin emits per operation.
 * - **`IsoDateCodec` on a response field** — `listMessages` items carry
 *   `createdAt` as an ISO 8601 string on the wire and a `Date` instance
 *   in TypeScript.
 * - **`IsoDateCodec` round-trip on POST** — `createMessage` returns
 *   `{ id, text, createdAt }` with the same Date decoding on the
 *   response side.
 * - **`Int64Codec` on a path parameter + ApiKeyAuth** — `getBlockMetadata`
 *   takes a `bigint` block height that the input transformer encodes to
 *   a digit string for the URL, gated by the registry's
 *   `ApiKeyAuth` security scheme. The server runs the auth handler
 *   before the request validator, so an unauthenticated request is
 *   rejected with 401 before the path codec ever decodes.
 *
 * Rendered unconditionally on the home page so the codec round-trips
 * are visible from a fresh checkout (no wallet connection required) and
 * the page itself doubles as a manual smoke test for `pnpm dev`.
 *
 * The `data-testid` attributes are stable selectors for browser-level
 * verification (Playwright). The values surfaced — `typeof` of the
 * decoded fields and the formatted view — are exactly the things that
 * silently regress if a codec stops being applied at the SDK boundary.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { createMessage } from '@polygonlabs/example-client';
import {
  getBlockMetadataOptions,
  getBlockNumberOptions,
  listMessagesOptions,
  listMessagesQueryKey
} from '@polygonlabs/example-client/react';

import { ApiErrorMessage } from './api-error-message';

const MANAGEMENT_API_KEY = 'local-dev-secret';

export const CodecTest = () => {
  const queryClient = useQueryClient();
  // `meta.operation` flows into the global QueryCache.onError handler
  // (see `app.tsx`) for Sentry tagging. Spreading the factory's
  // queryOptions then layering meta keeps the codec-aware factory's
  // queryFn / queryKey / generic typing intact.
  const blockNumber = useQuery({
    ...getBlockNumberOptions(),
    meta: { operation: 'getBlockNumber' }
  });
  const messages = useQuery({ ...listMessagesOptions(), meta: { operation: 'listMessages' } });

  const [text, setText] = useState('hello from codec round-trip');
  // The imperative `createMessage` call goes through the codec-aware
  // wrapper. `r.error` is statically widened to
  // `CreateMessageError | TransportError | ResponseValidationError | undefined`,
  // so the rethrow surfaces at `mutation.error` carrying the
  // wrapper-narrowed shape — `<ApiErrorMessage>` then narrows it
  // via the per-client guards re-exported from `@polygonlabs/example-client`.
  // No `as` casts at any call site.
  //
  // `meta.operation` is read by the global `MutationCache.onError`
  // handler (see `app.tsx`) when reporting to Sentry — gives every
  // captured event a stable per-call-site tag.
  const createMessageMut = useMutation({
    mutationFn: async (vars: { text: string }) => {
      const r = await createMessage({ body: { text: vars.text } });
      if (r.error) throw r.error;
      if (!r.data) throw new Error('createMessage returned no data');
      return r.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: listMessagesQueryKey() }),
    meta: { operation: 'createMessage' }
  });

  // `getBlockMetadataOptions` is the codec-aware factory emitted by
  // `@polygonlabs/zod-to-openapi-heyapi` — its `path` parameter type is
  // `{ blockNumber: bigint }` (Int64Codec runtime shape) and the factory
  // pre-encodes the bigint into the queryKey as a digit string so the
  // default JSON.stringify-based queryKey hash stays stable. The queryFn
  // calls the raw SDK function with already-wire-shape values from
  // queryKey[0]. This is the round-trip the plugin promises end-to-end.
  //
  // `blockHeight` is a free-text input — `BigInt('')` and `BigInt('foo')`
  // throw a `SyntaxError` at *render* time (the factory call runs in the
  // render body, before `enabled: false` has any say). Validate the
  // string before constructing the bigint and surface a non-fatal error
  // for the user instead of crashing the panel.
  const [blockHeight, setBlockHeight] = useState('23000000');
  const validBlockHeight = /^\d+$/.test(blockHeight) ? BigInt(blockHeight) : null;
  const blockMetadata = useQuery({
    ...getBlockMetadataOptions({
      path: { blockNumber: validBlockHeight ?? BigInt(0) },
      headers: { 'x-api-key': MANAGEMENT_API_KEY }
    }),
    enabled: false,
    meta: { operation: 'getBlockMetadata' }
  });

  return (
    <section
      data-testid="codec-test"
      className="flex flex-col gap-6 rounded border border-grey-light p-4"
    >
      <header>
        <h2 className="text-xl font-semibold text-grey">Codec round-trip</h2>
        <p className="text-sm text-grey">
          Live verification that registered codecs (`Int64Codec`, `IsoDateCodec`) survive the
          SDK&nbsp;→&nbsp;wire&nbsp;→&nbsp;runtime trip. Each panel hits a real route on the
          example-rest-api dev server and shows the runtime type the typed client decoded.
        </p>
      </header>

      <div data-testid="block-number-panel">
        <h3 className="font-medium">Int64Codec response · getBlockNumber</h3>
        {blockNumber.isPending && <p>loading…</p>}
        {blockNumber.error && (
          <ApiErrorMessage testId="block-number-error" error={blockNumber.error} />
        )}
        {blockNumber.data && (
          <p>
            type: <code data-testid="block-number-type">{typeof blockNumber.data.blockNumber}</code>{' '}
            value:{' '}
            <code data-testid="block-number-value">{blockNumber.data.blockNumber.toString()}</code>{' '}
            formatted:{' '}
            <code data-testid="block-number-formatted">
              {blockNumber.data.blockNumber.toLocaleString()}
            </code>
          </p>
        )}
      </div>

      <div data-testid="messages-panel">
        <h3 className="font-medium">IsoDateCodec response · listMessages / createMessage</h3>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            createMessageMut.mutate({ text });
          }}
        >
          <input
            data-testid="message-text-input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="flex-1 rounded border border-grey-light px-2 py-1"
          />
          <button
            data-testid="message-create-button"
            type="submit"
            disabled={createMessageMut.isPending}
            className="rounded border border-grey-light px-3"
          >
            create
          </button>
        </form>
        {createMessageMut.error && (
          <ApiErrorMessage testId="create-error" error={createMessageMut.error} />
        )}
        {createMessageMut.data && (
          <p data-testid="create-result">
            created id: <code>{createMessageMut.data.id}</code> createdAt type:{' '}
            <code data-testid="create-createdat-type">
              {createMessageMut.data.createdAt instanceof Date
                ? 'Date'
                : typeof createMessageMut.data.createdAt}
            </code>{' '}
            createdAt iso:{' '}
            <code data-testid="create-createdat-iso">
              {createMessageMut.data.createdAt instanceof Date
                ? createMessageMut.data.createdAt.toISOString()
                : String(createMessageMut.data.createdAt)}
            </code>
          </p>
        )}
        {messages.data && (
          <ul data-testid="messages-list" className="mt-2 space-y-1">
            {messages.data.items.map((m) => (
              <li key={m.id}>
                <code>{m.text}</code> · createdAt type:{' '}
                <code className="message-createdat-type">
                  {m.createdAt instanceof Date ? 'Date' : typeof m.createdAt}
                </code>{' '}
                ·{' '}
                <code>
                  {m.createdAt instanceof Date ? m.createdAt.toISOString() : String(m.createdAt)}
                </code>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div data-testid="block-metadata-panel">
        <h3 className="font-medium">Int64Codec on path param + ApiKeyAuth · getBlockMetadata</h3>
        <div className="flex gap-2">
          <input
            data-testid="block-metadata-input"
            value={blockHeight}
            onChange={(e) => setBlockHeight(e.target.value)}
            className="flex-1 rounded border border-grey-light px-2 py-1"
          />
          <button
            data-testid="block-metadata-fetch-button"
            type="button"
            onClick={() => blockMetadata.refetch()}
            disabled={validBlockHeight === null}
            className="rounded border border-grey-light px-3 disabled:opacity-50"
          >
            fetch
          </button>
        </div>
        {validBlockHeight === null && (
          <p data-testid="block-metadata-input-error">enter a positive integer block height</p>
        )}
        {blockMetadata.isFetching && <p>loading…</p>}
        {blockMetadata.error && (
          <ApiErrorMessage testId="block-metadata-error" error={blockMetadata.error} />
        )}
        {blockMetadata.data && (
          <p data-testid="block-metadata-result">
            number type:{' '}
            <code data-testid="block-metadata-number-type">{typeof blockMetadata.data.number}</code>{' '}
            value:{' '}
            <code data-testid="block-metadata-number-value">
              {blockMetadata.data.number.toString()}
            </code>{' '}
            timestamp type:{' '}
            <code data-testid="block-metadata-timestamp-type">
              {typeof blockMetadata.data.timestamp}
            </code>{' '}
            hash: <code data-testid="block-metadata-hash">{blockMetadata.data.hash}</code>
          </p>
        )}
      </div>
    </section>
  );
};
