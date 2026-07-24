import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { Account, JsonRpcProvider, KeyPairSigner } from "near-api-js";
import {
  DEFAULT_ACCOUNT_ID,
  DEFAULT_PRIVATE_KEY,
  Sandbox,
} from "near-sandbox";

const ONE_NEAR = 1_000_000_000_000_000_000_000_000n;
const MAX_GAS = 100_000_000_000_000n;

test("queries and changes a remote greeting through private callbacks", { timeout: 120_000 }, async () => {
  const sandbox = await Sandbox.start({});
  try {
    const provider = new JsonRpcProvider({ url: sandbox.rpcUrl });
    const signer = KeyPairSigner.fromSecretKey(DEFAULT_PRIVATE_KEY);
    const contractAccount = new Account(DEFAULT_ACCOUNT_ID, provider, signer);
    const publicKey = await signer.getPublicKey();
    const helloId = `hello.${DEFAULT_ACCOUNT_ID}`;
    const aliceId = `alice.${DEFAULT_ACCOUNT_ID}`;

    for (const accountOrPrefix of ["hello", "alice"]) {
      await contractAccount.createSubAccount({
        accountOrPrefix,
        publicKey,
        nearToTransfer: 30n * ONE_NEAR,
      });
    }

    const hello = new Account(helloId, provider, signer);
    const alice = new Account(aliceId, provider, signer);
    await hello.deployContract(new Uint8Array(await readFile(
      new URL("./test-contracts/hello-near/build/contract.wasm", import.meta.url),
    )));
    await contractAccount.deployContract(
      new Uint8Array(await readFile(new URL("./build/contract.wasm", import.meta.url))),
    );
    await contractAccount.callFunction({
      contractId: DEFAULT_ACCOUNT_ID,
      methodName: "init",
      args: { hello_account: helloId },
    });

    await assert.rejects(alice.callFunction({
      contractId: DEFAULT_ACCOUNT_ID,
      methodName: "query_greeting_callback",
      args: {},
    }));

    assert.equal(await alice.callFunction({
      contractId: DEFAULT_ACCOUNT_ID,
      methodName: "query_greeting",
      args: {},
      gas: MAX_GAS,
      waitUntil: "FINAL",
    }), "Hello");

    assert.equal(await alice.callFunction({
      contractId: DEFAULT_ACCOUNT_ID,
      methodName: "change_greeting",
      args: { new_greeting: "Howdy" },
      gas: MAX_GAS,
      waitUntil: "FINAL",
    }), true);

    assert.equal(await alice.callFunction({
      contractId: DEFAULT_ACCOUNT_ID,
      methodName: "query_greeting",
      args: {},
      gas: MAX_GAS,
      waitUntil: "FINAL",
    }), "Howdy");
  } finally {
    await sandbox.tearDown();
  }
});
