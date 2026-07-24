# NFT

A multi-file port of [nft-tutorial/nft-contract-approval](https://github.com/near-examples/nft-tutorial/tree/main/nft-contract-approval/src), using the current SDK and `near-sandbox`.

The source follows the tutorial’s layout: `src/lib.ts`, `approval.ts`,
`enumeration.ts`, `events.ts`, `internal.ts`, `metadata.ts`, `mint.ts`,
`nft_core.ts`, and `royalty.ts`.

Owner enumeration uses `LookupMap<string, OwnerTokens>`, where each `OwnerTokens` value is an ordinary array. This keeps the example within the current SDK’s collection model, but is not suitable for owners with very large NFT holdings.

```sh
npm install
npm test
```

This requires Node.js 22.22.2 or newer. `npm test` builds the NFT and its
small token-receiver contract, checks the Wasm exports, then runs the mint,
transfer, approval, enumeration, revocation, and transfer-call scenarios in a
fresh local sandbox. The NFT Wasm is written to `build/contract.wasm`.
