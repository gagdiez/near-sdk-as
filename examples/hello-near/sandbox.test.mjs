import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { Account, JsonRpcProvider, KeyPairSigner } from "near-api-js";
import {
  DEFAULT_ACCOUNT_ID,
  DEFAULT_PRIVATE_KEY,
  Sandbox,
} from "near-sandbox";

test("reads the default greeting and saves a replacement", { timeout: 120_000 }, async () => {
  const sandbox = await Sandbox.start({});
  try {
    const provider = new JsonRpcProvider({ url: sandbox.rpcUrl });
    const signer = KeyPairSigner.fromSecretKey(DEFAULT_PRIVATE_KEY);
    const account = new Account(DEFAULT_ACCOUNT_ID, provider, signer);
    const wasm = new Uint8Array(await readFile(
      new URL("./build/contract.wasm", import.meta.url),
    ));

    await account.deployContract(wasm);

    const initial = await provider.callFunction({
      contractId: DEFAULT_ACCOUNT_ID,
      method: "get_greeting",
      args: {},
    });
    assert.equal(initial, "Hello");

    await account.callFunction({
      contractId: DEFAULT_ACCOUNT_ID,
      methodName: "set_greeting",
      args: { greeting: "Howdy" },
    });

    const updated = await provider.callFunction({
      contractId: DEFAULT_ACCOUNT_ID,
      method: "get_greeting",
      args: {},
    });
    assert.equal(updated, "Howdy");
  } finally {
    await sandbox.tearDown();
  }
});
