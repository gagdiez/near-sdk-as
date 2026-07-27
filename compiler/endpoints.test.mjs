import assert from "node:assert/strict";
import test from "node:test";
import {
  discoverEndpoints,
  generateContractModule,
  generateEntry,
} from "./endpoints.mjs";

test("turns the single state class into a typed global value", () => {
  const generated = generateContractModule(`
    @contract_state
    export class State { greeting: string = "Hello"; }
    @view export function get(): string { return state.greeting; }
  `, "near-sdk-as");

  assert.equal(generated.className, "State");
  assert.match(generated.source, /@json\s+export class State/);
  assert.match(generated.source, /export const state: State/);
  assert.match(generated.source, /__loadContract<State>/);
});

test("binds collections to their owning state fields", () => {
  const generated = generateContractModule(`
    import * as collections from "near-sdk-as";
    @contract_state
    export class State {
      balances: collections.LookupMap<string, string> = new collections.LookupMap<string, string>();
      events: collections.Vector<string> = new collections.Vector<string>();
    }
  `, "near-sdk-as");

  assert.match(generated.source, /@omit\s+balances/);
  assert.match(generated.source, /@omit\s+events/);
  assert.match(generated.source, /state\.balances = new collections\.LookupMap<string, string>\(\)/);
  assert.match(generated.source, /state\.balances\.__bind\("state\.balances"\)/);
  assert.match(generated.source, /state\.events\.__bind\("state\.events"\)/);
});

test("rejects nested scalable collections", () => {
  assert.throws(() => generateContractModule(`
    import * as collections from "near-sdk-as";
    @contract_state
    export class State {
      nested: collections.Vector<collections.Vector<string>> =
        new collections.Vector<collections.Vector<string>>();
    }
  `, "near-sdk-as"), /Nested scalable collections are not supported/);
});

test("maps the public SDK import to a local build path", () => {
  const generated = generateContractModule(`
    import { near } from "near-sdk-as";
    @contract_state export class State {}
    @view export function get(): i32 { near.log("get"); return 0; }
  `, "../../src/index");

  assert.match(generated.source, /import \{ near \} from "\.\.\/\.\.\/src\/index"/);
  assert.doesNotMatch(generated.source, /from "near-sdk-as"/);
});

test("requires exactly one contract state class", () => {
  assert.throws(() => generateContractModule("", "near-sdk-as"), /found 0/);
  assert.throws(
    () => generateContractModule("@contract_state class A {} @contract_state class B {}", "near-sdk-as"),
    /found 2/,
  );
});

test("allows default state fields alongside an init endpoint", () => {
  const source = `
    @contract_state export class State { owner: string = ""; }
    @init export function init(owner: string): void {}
  `;
  assert.match(generateContractModule(source, "near-sdk-as").source, /owner: string = ""/);
});

test("discovers typed call and view functions", () => {
  const endpoints = discoverEndpoints(`
    @call
    export function mint(args: MintArgs): NFT { return args.nft; }

    @view
    export function supply(): u64 { return 0; }
  `);

  assert.deepEqual(endpoints, [
    {
      kind: "call",
      name: "mint",
      parameters: [{ name: "args", type: "MintArgs" }],
      returnType: "NFT",
      returnsVoid: false,
    },
    {
      kind: "view",
      name: "supply",
      parameters: [],
      returnType: "u64",
      returnsVoid: false,
    },
  ]);
});

test("discovers multiple named endpoint parameters", () => {
  const [endpoint] = discoverEndpoints(
    "@call export function mint(id: string, title: string): void {}",
  );
  assert.deepEqual(endpoint.parameters, [
    { name: "id", type: "string" },
    { name: "title", type: "string" },
  ]);
});

test("imports custom endpoint parameter types", () => {
  const endpoints = discoverEndpoints(
    "@call export function create(args: TokenArgs): void {}",
  );
  const entry = generateEntry({
    sourceImport: "../contract",
    sdkImport: "near-sdk-as",
    endpoints,
  });
  assert.match(entry, /create as __create,\n  TokenArgs,/);
});

test("imports SDK value types from the SDK", () => {
  const endpoints = discoverEndpoints(
    "@call export function refund(amount: NearToken): void {}",
  );
  const entry = generateEntry({
    sourceImport: "../contract",
    sdkImport: "near-sdk-as",
    endpoints,
  });
  assert.match(entry, /__readInput,\n  NearToken,/);
  assert.doesNotMatch(entry, /refund as __refund,\n  NearToken,/);
  assert.match(entry, /amount!: string/);
  assert.match(entry, /__refund\(NearToken\.fromYoctoNear\(args\.amount\)\)/);

  const [mint] = discoverEndpoints(
    "@call export function mint(amount: UInt128): void {}",
  );
  const mintEntry = generateEntry({
    sourceImport: "../contract",
    sdkImport: "near-sdk-as",
    endpoints: [mint],
  });
  assert.match(mintEntry, /__readInput,\n  UInt128,/);
  assert.match(mintEntry, /amount!: string/);
  assert.match(mintEntry, /__mint\(UInt128\.fromString\(args\.amount\)\)/);

  const [storageDeposit] = discoverEndpoints(
    "@call export function storage_deposit(account_id: AccountId | null = null): void {}",
  );
  const storageDepositEntry = generateEntry({
    sourceImport: "../contract",
    sdkImport: "near-sdk-as",
    endpoints: [storageDeposit],
  });
  assert.match(storageDepositEntry, /__readInput,\n  AccountId,/);
  assert.doesNotMatch(storageDepositEntry, /storage_deposit as __storage_deposit,\n  AccountId,/);
  assert.match(storageDepositEntry, /account_id: string \| null = null/);
  assert.match(storageDepositEntry, /__storage_deposit\(args\.account_id == null \? null : AccountId\.fromString\(args\.account_id!\)\)/);

  const [schedule] = discoverEndpoints(
    "@call export function schedule(end_time: Timestamp): Timestamp { return end_time; }",
  );
  const scheduleEntry = generateEntry({
    sourceImport: "../contract",
    sdkImport: "near-sdk-as",
    endpoints: [schedule],
  });
  assert.match(scheduleEntry, /__readInput,\n  UInt64,/);
  assert.match(scheduleEntry, /end_time!: string/);
  assert.match(scheduleEntry, /__schedule\(UInt64\.fromString\(args\.end_time\)\)/);
  assert.match(scheduleEntry, /__returnJson\(result\.toString\(\)\)/);
});

test("returns UInt128 values as NEAR JSON decimal strings", () => {
  const [endpoint] = discoverEndpoints(
    "@view export function total_supply(): UInt128 { return UInt128.zero(); }",
  );
  const entry = generateEntry({
    sourceImport: "../contract",
    sdkImport: "near-sdk-as",
    endpoints: [endpoint],
  });
  assert.match(entry, /__returnJson\(result\.toString\(\)\)/);
});

test("preserves endpoint parameter defaults in the generated JSON binding", () => {
  const [endpoint] = discoverEndpoints(
    "@call export function increment(number: i8 = 1): void {}",
  );
  assert.deepEqual(endpoint.parameters, [
    { name: "number", type: "i8", defaultValue: "1" },
  ]);

  const entry = generateEntry({
    sourceImport: "../contract",
    sdkImport: "near-sdk-as",
    endpoints: [endpoint],
  });
  assert.match(entry, /number: i8 = 1/);
  assert.match(entry, /__increment\(args\.number\)/);
});

test("payable calls accept deposits without weakening other calls", () => {
  const endpoints = discoverEndpoints(`
    @call({ payable: true })
    export function add_message(text: string): void {}
    @call
    export function clear(): void {}
  `);
  assert.equal(endpoints[0].payable, true);
  assert.equal(endpoints[1].payable, undefined);

  const entry = generateEntry({
    sourceImport: "../contract",
    sdkImport: "near-sdk-as",
    endpoints,
  });
  assert.match(entry, /export function add_message\(\): void \{\n  const args/);
  assert.match(entry, /export function clear\(\): void \{\n  __requireNoDeposit\(\)/);
});

test("private calls require the contract itself as predecessor", () => {
  const [endpoint] = discoverEndpoints(
    "@call({ privateMethod: true }) export function callback(): void {}",
  );
  assert.equal(endpoint.private, true);

  const entry = generateEntry({
    sourceImport: "../contract",
    sdkImport: "near-sdk-as",
    endpoints: [endpoint],
  });
  assert.match(entry, /__requirePrivate\(\)/);
});

test("init endpoints require absent state and persist the contract", () => {
  const [endpoint] = discoverEndpoints(
    "@init export function init(owner: string): void {}",
  );
  assert.equal(endpoint.kind, "init");

  const entry = generateEntry({
    sourceImport: "../contract",
    sdkImport: "near-sdk-as",
    endpoints: [endpoint],
  });
  assert.match(entry, /__requireNoDeposit\(\)/);
  assert.match(entry, /__requireUninitialized\(\)/);
  assert.match(entry, /__init\(args\.owner\)/);
  assert.match(entry, /__saveContract\(__state\)/);

  assert.throws(
    () => discoverEndpoints("@init({ payable: true }) export function init(): void {}"),
    /cannot be payable/,
  );
  assert.throws(
    () => discoverEndpoints("@init({ privateMethod: true }) export function init(): void {}"),
    /cannot be private/,
  );
});

test("panicOnDefault makes non-init endpoints require initialized state", () => {
  const endpoints = discoverEndpoints(`
    @init export function init(): void {}
    @view export function get(): i32 { return 0; }
    @call export function set(): void {}
  `);
  const entry = generateEntry({
    sourceImport: "../contract",
    sdkImport: "near-sdk-as",
    endpoints,
    panicOnDefault: true,
  });
  assert.match(entry, /__requireInitialized,/);
  assert.match(entry, /export function get\(\): void \{\n  __requireInitialized\(\)/);
  assert.match(entry, /export function set\(\): void \{\n  __requireInitialized\(\)/);
});

test("ordinary state does not require initialization before non-init endpoints", () => {
  const endpoints = discoverEndpoints(`
    @init export function init(): void {}
    @view export function get(): i32 { return 0; }
  `);
  const entry = generateEntry({
    sourceImport: "../contract",
    sdkImport: "near-sdk-as",
    endpoints,
  });
  assert.doesNotMatch(entry, /__requireInitialized/);
});

test("reads panicOnDefault from the contract state decorator", () => {
  const generated = generateContractModule(`
    @contract_state({ panicOnDefault: true })
    export class State {}
  `, "near-sdk-as");
  assert.equal(generated.panicOnDefault, true);
  assert.match(generated.source, /@json\s+export class State/);
});

test("views cannot be payable", () => {
  assert.throws(
    () => discoverEndpoints("@view({ payable: true }) export function get(): i32 {}"),
    /cannot be payable/,
  );
});

test("every non-payable endpoint rejects attached deposits", () => {
  const endpoints = discoverEndpoints(`
    @view export function get(): i32 { return 0; }
    @call export function set(): void {}
  `);
  const entry = generateEntry({
    sourceImport: "../contract",
    sdkImport: "near-sdk-as",
    endpoints,
  });
  assert.match(entry, /export function get\(\): void \{\n  __requireNoDeposit\(\)/);
  assert.match(entry, /export function set\(\): void \{\n  __requireNoDeposit\(\)/);
});

test("returned promises become the endpoint result", () => {
  const [endpoint] = discoverEndpoints(
    "@call export function query(): Promise { return promise; }",
  );
  assert.equal(endpoint.returnsPromise, true);

  const entry = generateEntry({
    sourceImport: "../contract",
    sdkImport: "near-sdk-as",
    endpoints: [endpoint],
  });
  assert.match(entry, /__returnPromise\(result\)/);
  assert.doesNotMatch(entry, /__returnJson\(result\)/);

  assert.throws(
    () => discoverEndpoints("@view export function query(): Promise {}"),
    /cannot return a Promise/,
  );
});

test("generates a separate, zero-argument Wasm entry module", () => {
  const entry = generateEntry({
    sourceImport: "../contract",
    sdkImport: "near-sdk-as",
    endpoints: [
      {
        kind: "call",
        name: "mint",
        parameters: [{ name: "id", type: "string" }, { name: "title", type: "string" }],
        returnType: "NFT",
        returnsVoid: false,
      },
      {
        kind: "view",
        name: "version",
        parameters: [],
        returnType: "string",
        returnsVoid: false,
      },
    ],
  });

  assert.match(entry, /mint as __mint/);
  assert.match(entry, /state as __state/);
  assert.match(entry, /class __Args_mint/);
  assert.match(entry, /id!: string/);
  assert.match(entry, /__mint\(args\.id, args\.title\)/);
  assert.match(entry, /__saveContract\(__state\)/);
  assert.match(entry, /export function version\(\): void/);
  assert.doesNotMatch(entry, /MintArgs/);
});
