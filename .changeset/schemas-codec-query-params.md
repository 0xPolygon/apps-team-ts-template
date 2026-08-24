---
'@polygonlabs/example-schemas': patch
'@polygonlabs/example-client': patch
---

Replace `z.coerce` query parameters with codecs

`ListEventsQuery.chain` now uses `SafeIntegerCodec` from `@polygonlabs/zod-codecs` and `limit` rolls a local range-constrained codec. In zod v4 a coercing schema's input type is `unknown`, so the generated OpenAPI documented these parameters as optional and nullable regardless of intent; `@polygonlabs/openapi-registry` v3 rejects coercing schemas in parameter positions at generate time. The regenerated spec documents the wire honestly (string + pattern) while the validator and generated client expose runtime numbers through the codec machinery.
