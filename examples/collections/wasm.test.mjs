import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("collections example exports its endpoints", async () => {
  const module = await WebAssembly.compile(await readFile(
    new URL("./build/contract.wasm", import.meta.url),
  ));
  const exports = WebAssembly.Module.exports(module);
  for (const name of ["seed", "mutate", "snapshot"]) {
    assert.ok(exports.some((item) => item.name === name && item.kind === "function"));
  }
});
