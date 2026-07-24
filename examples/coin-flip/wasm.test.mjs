import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("coin flip exports its two endpoints", async () => {
  const bytes = await readFile(new URL("./build/contract.wasm", import.meta.url));
  const module = await WebAssembly.compile(bytes);
  const exports = WebAssembly.Module.exports(module);
  const names = new Set(exports.map(({ name, kind }) => kind === "function" ? name : null));

  assert.ok(names.has("flip_coin"));
  assert.ok(names.has("points_of"));
});
