import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { Account, JsonRpcProvider, KeyPairSigner } from "near-api-js";
import {
  DEFAULT_ACCOUNT_ID,
  DEFAULT_PRIVATE_KEY,
  Sandbox,
} from "near-sandbox";

test("field-owned collections persist entries and nested values", { timeout: 120_000 }, async () => {
  const sandbox = await Sandbox.start({});
  try {
    const provider = new JsonRpcProvider({ url: sandbox.rpcUrl });
    const signer = KeyPairSigner.fromSecretKey(DEFAULT_PRIVATE_KEY);
    const account = new Account(DEFAULT_ACCOUNT_ID, provider, signer);
    await account.deployContract(new Uint8Array(await readFile(
      new URL("../build/contract.wasm", import.meta.url),
    )));

    await account.callFunction({
      contractId: DEFAULT_ACCOUNT_ID,
      methodName: "seed",
      args: {},
    });
    assert.deepEqual(await provider.callFunction({
      contractId: DEFAULT_ACCOUNT_ID,
      method: "snapshot",
      args: {},
    }), {
      lookup: 1,
      map_keys: ["alice", "bob"],
      set_values: ["first", "second"],
      vector_values: ["one", "two"],
      deferred: "loaded on demand",
      option: "optional",
      profile: { account_id: "alice", metadata: { title: "Nested value" } },
    });

    await account.callFunction({
      contractId: DEFAULT_ACCOUNT_ID,
      methodName: "mutate",
      args: {},
    });
    assert.deepEqual(await provider.callFunction({
      contractId: DEFAULT_ACCOUNT_ID,
      method: "snapshot",
      args: {},
    }), {
      lookup: 1,
      map_keys: ["bob"],
      set_values: ["second"],
      vector_values: ["two"],
      deferred: "loaded on demand",
      option: "",
      profile: { account_id: "alice", metadata: { title: "Nested value" } },
    });
  } finally {
    await sandbox.tearDown();
  }
});
