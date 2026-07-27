import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { Account, JsonRpcProvider, KeyPairSigner } from "near-api-js";
import {
  DEFAULT_ACCOUNT_ID,
  DEFAULT_PRIVATE_KEY,
  Sandbox,
} from "near-sandbox";

test("increments, decrements, resets, and enforces counter bounds", { timeout: 120_000 }, async () => {
  const sandbox = await Sandbox.start({});
  try {
    const provider = new JsonRpcProvider({ url: sandbox.rpcUrl });
    const signer = KeyPairSigner.fromSecretKey(DEFAULT_PRIVATE_KEY);
    const account = new Account(DEFAULT_ACCOUNT_ID, provider, signer);
    const wasm = new Uint8Array(await readFile(
      new URL("../build/contract.wasm", import.meta.url),
    ));

    await account.deployContract(wasm);

    const getNum = () => provider.callFunction({
      contractId: DEFAULT_ACCOUNT_ID,
      method: "get_num",
      args: {},
    });
    const call = (methodName, args = {}) => account.callFunction({
      contractId: DEFAULT_ACCOUNT_ID,
      methodName,
      args,
    });

    assert.equal(await getNum(), 0);

    await call("increment");
    assert.equal(await getNum(), 1);

    await call("increment", { number: 10 });
    assert.equal(await getNum(), 11);

    await call("reset");
    await call("increment", { number: -10 });
    assert.equal(await getNum(), -10);

    await call("reset");
    await call("increment");
    await call("decrement");
    assert.equal(await getNum(), 0);

    await call("decrement", { number: 10 });
    assert.equal(await getNum(), -10);

    await call("decrement", { number: -10 });
    assert.equal(await getNum(), 0);

    await call("increment");
    await call("increment");
    await call("reset");
    assert.equal(await getNum(), 0);

    await call("increment", { number: 127 });
    await assert.rejects(call("increment"));
    assert.equal(await getNum(), 127);

    await call("reset");
    await call("decrement", { number: 127 });
    await call("decrement");
    assert.equal(await getNum(), -128);
    await assert.rejects(call("decrement"));
    assert.equal(await getNum(), -128);
  } finally {
    await sandbox.tearDown();
  }
});
