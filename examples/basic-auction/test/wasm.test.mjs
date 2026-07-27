import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("basic auction exports its public contract methods", async () => {
  const module = await WebAssembly.compile(await readFile(new URL("../build/contract.wasm", import.meta.url)));
  const names = new Set(WebAssembly.Module.exports(module).map(({ name }) => name));
  for (const name of ["init", "bid", "claim", "get_highest_bid", "get_auction_end_time", "get_auctioneer", "get_claimed"]) {
    assert.ok(names.has(name), `missing ${name}`);
  }
});
