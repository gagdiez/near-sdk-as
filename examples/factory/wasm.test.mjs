import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("factory exports its ordinary deployment endpoints", async () => {
  const bytes = await readFile(new URL("./build/contract.wasm", import.meta.url));
  const module = await WebAssembly.compile(bytes);
  const names = new Set(WebAssembly.Module.exports(module)
    .map(({ name, kind }) => kind === "function" ? name : null));
  for (const name of ["get_required", "create_token", "create_callback"]) {
    assert.ok(names.has(name), `missing ${name}`);
  }

  const imports = new Set(WebAssembly.Module.imports(module).map(({ name }) => name));
  for (const name of [
    "promise_batch_action_create_account",
    "promise_batch_action_transfer",
    "promise_batch_action_deploy_contract",
    "promise_batch_action_function_call",
    "promise_batch_action_function_call_weight",
    "promise_batch_action_stake",
    "promise_batch_action_add_key_with_full_access",
    "promise_batch_action_add_key_with_function_call",
    "promise_batch_action_delete_key",
    "promise_batch_action_delete_account",
    "promise_batch_action_deploy_global_contract",
    "promise_batch_action_deploy_global_contract_by_account_id",
    "promise_batch_action_use_global_contract",
    "promise_batch_action_use_global_contract_by_account_id",
    "promise_batch_action_transfer_to_gas_key",
    "promise_batch_action_add_gas_key_with_full_access",
    "promise_batch_action_add_gas_key_with_function_call",
  ]) {
    assert.ok(imports.has(name), `missing host action ${name}`);
  }
});
