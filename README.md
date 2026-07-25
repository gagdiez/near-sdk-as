# near-sdk-as

An experimental, contract-first AssemblyScript SDK for NEAR.

The examples progress from Hello NEAR through an NFT contract, with one root
state object, generated JSON bindings, and tests against `near-sandbox`.

## Contract model

```ts
import { near } from "near-sdk-as";

@contract_state
export class State {
  greeting: string = "Hello";
}

@view
export function get_greeting(): string {
  return state.greeting;
}

@call
export function set_greeting(greeting: string): void {
  near.log("Saving greeting: " + greeting);
  state.greeting = greeting;
}
```

There must be exactly one `@contract_state` class. The build generates the typed
global `state` value and stores it under one fixed internal key.

- Missing state is initialized with `new State()`.
- `@view` functions never persist state.
- A successful `@call` persists state once, after the function returns.
- `@init` persists the initial state and fails if state already exists.
- `@json` types can be used for structured values and nested state fields.
- Endpoint parameters become fields in NEAR's JSON argument object; the generated
  binding handles that envelope.

The generated AssemblyScript remains inspectable in `.near/generated-entry.ts`
and beside the contract as `*.near.generated.ts`.

## Scalable collections

Use ordinary arrays and objects for small state. For data that can grow, import
the collection namespace and make it an explicit `@contract_state` field:

```ts
import { NearToken } from "near-sdk-as";
import * as collections from "near-sdk-as";

@contract_state
export class State {
  balances: collections.LookupMap<string, NearToken> =
    new collections.LookupMap<string, NearToken>();
  messages: collections.Vector<Message> = new collections.Vector<Message>();
}
```

The compiler derives each collection's storage namespace from its state
field, so users never supply prefixes or coordinate global storage names.
Collection entries are stored separately from the root contract object; a
single `balances.set(...)` does not rewrite every balance.

- `LookupMap` and `LookupSet` provide scalable non-iterable lookup.
- `IterableMap` and `IterableSet` provide explicit paginated `keys`, `values`,
  and `entries` access. Their iteration order may change after deletion.
- `Vector` provides indexed, paginated storage.
- `Deferred` and `LazyOption` store one separately loaded required or optional
  value.

All collections use `get(key, fallback)` plus `getSome(key)` rather than a
generic nullable return, because AssemblyScript numeric types cannot be null.
Do not rename a collection field after deployment without a storage migration:
the field name is its stable namespace.

`@json` values may contain any nested ordinary structures. A scalable
collection may not contain another scalable collection: an inner collection
would need its own per-entry namespace, so the compiler rejects that shape
until there is a deliberate design for it.

## Build and test

```sh
npm install
npm run build
npm test
```

`npm test` uses the Node test runner for compiler checks and `near-sandbox` for
the deployment/state round-trip. Each example keeps its Wasm and Sandbox tests
beside its contract. `near-api-js` is used only to submit the Wasm and
transactions to the Sandbox RPC endpoint; there is no mock VM or simulator.

Every directory under `examples/` is also a standalone npm project. Copy one
to a new repository and run `npm install && npm test`; its README and scripts
include any auxiliary contracts it needs.

## Example progression

Functionality will be added only when required by these examples:

1. Hello NEAR ✓
2. Counter ✓
3. Guest book ✓
4. Donation ✓
5. Coin flip ✓
6. Simple cross-contract call ✓
7. Advanced cross-contract call ✓
8. Factory (ordinary contract deployment) ✓
9. Collections and nested values ✓
10. NFT (core, approval, enumeration, and transfer-call) ✓

Each port preserves the upstream Rust and TypeScript test scenarios where they
exist. Additional compiler and `near-sandbox` integration tests extend that baseline.

The old implementation remains in `old-sdk/` only as a parity reference.
