# Contract Factory

Creates an account, deploys an embedded token contract, initializes it, and refunds failed deployments.
The token contract under `token/` is built and embedded automatically.

## Requirements

- Node.js 22.22.2 or newer
- npm

## Run

```bash
npm install
npm test
```

`npm test` builds the contract, checks its Wasm interface, starts a fresh
`near-sandbox`, and runs the integration scenarios.

To build without testing:

```bash
npm run build
```

The resulting contract is written to `build/contract.wasm`.

## Project files

- `contract.ts` — contract source
- `near-globals.d.ts` — editor declarations for SDK decorators and `state`
- `wasm.test.mjs` — Wasm interface checks
- `sandbox.test.mjs` — end-to-end sandbox tests

