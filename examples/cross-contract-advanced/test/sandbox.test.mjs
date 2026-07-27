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
const MAX_GAS = 250_000_000_000_000n;

test("aggregates calls, runs parallel requests, and batches actions", { timeout: 120_000 }, async () => {
  const sandbox = await Sandbox.start({});
  try {
    const provider = new JsonRpcProvider({ url: sandbox.rpcUrl });
    const signer = KeyPairSigner.fromSecretKey(DEFAULT_PRIVATE_KEY);
    const main = new Account(DEFAULT_ACCOUNT_ID, provider, signer);
    const publicKey = await signer.getPublicKey();
    const accountId = (prefix) => `${prefix}.${DEFAULT_ACCOUNT_ID}`;

    for (const accountOrPrefix of ["hello", "counter", "guestbook", "alice"]) {
      await main.createSubAccount({
        accountOrPrefix,
        publicKey,
        nearToTransfer: 30n * ONE_NEAR,
      });
    }

    const hello = new Account(accountId("hello"), provider, signer);
    const counter = new Account(accountId("counter"), provider, signer);
    const guestbook = new Account(accountId("guestbook"), provider, signer);
    const alice = new Account(accountId("alice"), provider, signer);

    await hello.deployContract(new Uint8Array(await readFile(
      new URL("../test-contracts/hello-near/build/contract.wasm", import.meta.url),
    )));
    await counter.deployContract(new Uint8Array(await readFile(
      new URL("../test-contracts/counters/build/contract.wasm", import.meta.url),
    )));
    await guestbook.deployContract(new Uint8Array(await readFile(
      new URL("../test-contracts/guest-book/build/contract.wasm", import.meta.url),
    )));
    await main.deployContract(
      new Uint8Array(await readFile(new URL("../build/contract.wasm", import.meta.url))),
    );
    await main.callFunction({
      contractId: DEFAULT_ACCOUNT_ID,
      methodName: "init",
      args: {
        hello_account: hello.accountId,
        counter_account: counter.accountId,
        guestbook_account: guestbook.accountId,
      },
    });

    await alice.callFunction({
      contractId: hello.accountId,
      methodName: "set_greeting",
      args: { greeting: "Howdy" },
    });
    await alice.callFunction({
      contractId: guestbook.accountId,
      methodName: "add_message",
      args: { text: "my message" },
    });
    await alice.callFunction({
      contractId: counter.accountId,
      methodName: "decrement",
      args: {},
    });

    assert.deepEqual(await alice.callFunction({
      contractId: DEFAULT_ACCOUNT_ID,
      methodName: "multiple_contracts",
      args: {},
      gas: MAX_GAS,
      waitUntil: "FINAL",
    }), {
      greeting: "Howdy",
      counter: -1,
      messages: [{
        premium: false,
        sender: alice.accountId,
        text: "my message",
      }],
    });

    assert.deepEqual(await alice.callFunction({
      contractId: DEFAULT_ACCOUNT_ID,
      methodName: "similar_contracts",
      args: {},
      gas: MAX_GAS,
      waitUntil: "FINAL",
    }), ["hi", "howdy", "bye"]);

    assert.equal(await alice.callFunction({
      contractId: DEFAULT_ACCOUNT_ID,
      methodName: "batch_actions",
      args: {},
      gas: MAX_GAS,
      waitUntil: "FINAL",
    }), "bye");
  } finally {
    await sandbox.tearDown();
  }
});
