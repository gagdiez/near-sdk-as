import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("advanced cross-contract call exports its endpoints", async () => {
  const bytes = await readFile(new URL("../build/contract.wasm", import.meta.url));
  const module = await WebAssembly.compile(bytes);
  const exports = WebAssembly.Module.exports(module);
  const names = new Set(exports.map(({ name, kind }) => kind === "function" ? name : null));

  for (const name of [
    "init",
    "multiple_contracts",
    "multiple_contracts_callback",
    "similar_contracts",
    "similar_contracts_callback",
    "batch_actions",
    "batch_actions_callback",
  ]) {
    assert.ok(names.has(name), `missing ${name}`);
  }
});
