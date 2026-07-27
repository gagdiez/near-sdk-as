import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("donation exports its seven endpoints", async () => {
  const bytes = await readFile(new URL("../build/contract.wasm", import.meta.url));
  const module = await WebAssembly.compile(bytes);
  const exports = WebAssembly.Module.exports(module);
  const names = new Set(exports.map(({ name, kind }) => kind === "function" ? name : null));

  for (const name of [
    "init",
    "get_beneficiary",
    "change_beneficiary",
    "donate",
    "get_donation_for_account",
    "number_of_donors",
    "get_donations",
  ]) assert.ok(names.has(name), `missing ${name}`);
});
