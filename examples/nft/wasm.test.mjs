import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("NFT exports the NEP-171 core, approval, and enumeration endpoints", async () => {
  const module = await WebAssembly.compile(await readFile(new URL("./build/contract.wasm", import.meta.url)));
  const names = new Set(WebAssembly.Module.exports(module).map(({ name }) => name));
  for (const name of ["init", "nft_mint", "nft_transfer", "nft_transfer_call", "nft_token", "nft_approve", "nft_revoke", "nft_revoke_all", "nft_is_approved", "nft_total_supply", "nft_tokens", "nft_supply_for_owner", "nft_tokens_for_owner", "nft_metadata"]) {
    assert.ok(names.has(name), `missing ${name}`);
  }
});
