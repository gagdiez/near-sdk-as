# Donation

Records donations and forwards their transferable balance to a beneficiary.

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

- `src/contract.ts` — contract source
- `test/wasm.test.mjs` — Wasm interface checks
- `test/sandbox.test.mjs` — end-to-end sandbox tests
