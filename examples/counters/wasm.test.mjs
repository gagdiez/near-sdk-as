import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("counters exports its four endpoints", async () => {
  const bytes = await readFile(new URL("./build/contract.wasm", import.meta.url));
  const module = await WebAssembly.compile(bytes);
  const exports = WebAssembly.Module.exports(module);
  const names = new Set(exports.map(({ name, kind }) => kind === "function" ? name : null));

  assert.ok(names.has("get_num"));
  assert.ok(names.has("increment"));
  assert.ok(names.has("decrement"));
  assert.ok(names.has("reset"));
});
