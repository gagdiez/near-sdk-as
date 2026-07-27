import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("fungible token exports its NEP-141 and storage methods", async () => {
  const module = await WebAssembly.compile(await readFile(new URL("../build/contract.wasm", import.meta.url)));
  const names = new Set(WebAssembly.Module.exports(module).map(({ name }) => name));
  for (const name of [
    "init",
    "init_default_meta",
    "ft_metadata",
    "ft_total_supply",
    "ft_balance_of",
    "ft_transfer",
    "ft_transfer_call",
    "ft_resolve_transfer",
    "storage_deposit",
    "storage_balance_bounds",
    "storage_balance_of",
  ]) {
    assert.ok(names.has(name), `missing ${name}`);
  }
});
