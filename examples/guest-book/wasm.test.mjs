import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("guest book exports its three endpoints", async () => {
  const bytes = await readFile(new URL("./build/contract.wasm", import.meta.url));
  const module = await WebAssembly.compile(bytes);
  const exports = WebAssembly.Module.exports(module);
  const names = new Set(exports.map(({ name, kind }) => kind === "function" ? name : null));

  assert.ok(names.has("add_message"));
  assert.ok(names.has("get_messages"));
  assert.ok(names.has("total_messages"));
});
