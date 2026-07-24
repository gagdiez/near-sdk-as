# Collections

Shows scalable, field-owned collections with no user-managed storage prefixes.
It also stores a nested `Profile { metadata: Metadata }` value in a
`LookupMap`, demonstrating that ordinary `@json` structures work as collection
values.

Scalable collections cannot be nested inside another scalable collection. The
compiler rejects that shape because every inner collection would need a unique
per-entry storage namespace. Ordinary nested `@json` values, such as
`Profile.metadata`, are fully supported.

## Run

```bash
npm install
npm test
```

The contract is written to `build/contract.wasm`.
