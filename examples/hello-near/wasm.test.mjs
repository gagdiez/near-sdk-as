import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("hello-near emits NEAR-compatible Wasm exports", async () => {
  const bytes = await readFile(new URL("./build/contract.wasm", import.meta.url));
  const module = await WebAssembly.compile(bytes);
  const exports = WebAssembly.Module.exports(module);
  const imports = WebAssembly.Module.imports(module);

  assert.ok(exports.some(({ name, kind }) => name === "set_greeting" && kind === "function"));
  assert.ok(exports.some(({ name, kind }) => name === "get_greeting" && kind === "function"));
  assert.ok(imports.some(({ module: namespace, name }) => namespace === "env" && name === "storage_write"));
  assert.ok(imports.some(({ module: namespace, name }) => namespace === "env" && name === "input"));
});
