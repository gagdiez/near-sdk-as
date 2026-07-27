# near-sdk-as

An experimental, contract-first AssemblyScript SDK for NEAR.

The SDK has one root state object, generated JSON bindings, and tests against
`near-sandbox`. The featured example is a complete basic auction contract.

## Contract model

```ts
import { AccountId, near, NearToken, Promise, Timestamp } from "near-sdk-as";

@json
export class Bid {
  bidder: AccountId;
  bid: NearToken;

  constructor(bidder: AccountId, bid: NearToken) {
    this.bidder = bidder;
    this.bid = bid;
  }
}

@contract_state({ panicOnDefault: true })
export class State {
  highest_bid!: Bid;
  auction_end_time!: Timestamp;
  auctioneer!: AccountId;
  claimed: bool;
}

@init
export function init(end_time: Timestamp, auctioneer: AccountId): void {
  state.highest_bid = new Bid(
    AccountId.fromString(near.currentAccountId()),
    NearToken.fromYoctoNear("1"),
  );
  state.auction_end_time = end_time;
  state.auctioneer = auctioneer;
  state.claimed = false;
}

@call({ payable: true })
export function bid(): Promise {
  assert(state.auction_end_time.greaterThan(near.blockTimestamp()), "Auction has ended");
  const amount = near.attachedDeposit();
  assert(amount.greaterThan(state.highest_bid.bid), "Bid must be higher");

  const previous = state.highest_bid;
  state.highest_bid = new Bid(
    AccountId.fromString(near.predecessorAccountId()),
    amount,
  );
  return new Promise(previous.bidder.toString()).transfer(previous.bid);
}
```

There must be exactly one `@contract_state` class. The build generates the typed
global `state` value and stores it under one fixed internal key.

- By default, missing state is initialized with `new State()`.
- `@contract_state({ panicOnDefault: true })` instead rejects every non-init
  endpoint until an `@init` method has stored state. Use it when a contract has
  no meaningful default state.
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

The following examples are included in the `examples/` directory and have full parity with the Rust / TS examples:

1. Auction ✓
2. Hello NEAR ✓
3. Counter ✓
4. Guest book ✓
5. Donation ✓
6. Coin flip ✓
7. Simple cross-contract call ✓
8. Advanced cross-contract call ✓
9. Factory (ordinary contract deployment) ✓
10. Collections and nested values ✓
11. NFT (core, approval, enumeration, and transfer-call) ✓
