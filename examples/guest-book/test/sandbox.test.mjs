import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { Account, JsonRpcProvider, KeyPairSigner } from "near-api-js";
import {
  DEFAULT_ACCOUNT_ID,
  DEFAULT_PRIVATE_KEY,
  Sandbox,
} from "near-sandbox";

const POINT_ONE_NEAR = 100_000_000_000_000_000_000_000n;
const THIRTY_NEAR = 30_000_000_000_000_000_000_000_000n;

test("stores messages, marks premium posts, and paginates results", { timeout: 120_000 }, async () => {
  const sandbox = await Sandbox.start({});
  try {
    const provider = new JsonRpcProvider({ url: sandbox.rpcUrl });
    const signer = KeyPairSigner.fromSecretKey(DEFAULT_PRIVATE_KEY);
    const account = new Account(DEFAULT_ACCOUNT_ID, provider, signer);
    const aliceId = `alice.${DEFAULT_ACCOUNT_ID}`;
    await account.createSubAccount({
      accountOrPrefix: "alice",
      publicKey: await signer.getPublicKey(),
      nearToTransfer: THIRTY_NEAR,
    });
    const alice = new Account(aliceId, provider, signer);
    const wasm = new Uint8Array(await readFile(
      new URL("../build/contract.wasm", import.meta.url),
    ));

    await account.deployContract(wasm);

    const view = (method, args = {}) => provider.callFunction({
      contractId: DEFAULT_ACCOUNT_ID,
      method,
      args,
    });
    const addMessage = (caller, text, deposit) => caller.callFunction({
      contractId: DEFAULT_ACCOUNT_ID,
      methodName: "add_message",
      args: { text },
      ...(deposit === undefined ? {} : { deposit }),
    });

    assert.equal(await view("total_messages"), 0);
    assert.deepEqual(await view("get_messages"), []);

    await addMessage(account, "aloha");
    assert.deepEqual(await view("get_messages"), [
      { premium: false, sender: DEFAULT_ACCOUNT_ID, text: "aloha" },
    ]);

    await addMessage(alice, "hola", POINT_ONE_NEAR * 10n);
    assert.equal(await view("total_messages"), 2);
    assert.deepEqual(await view("get_messages"), [
      { premium: false, sender: DEFAULT_ACCOUNT_ID, text: "aloha" },
      { premium: true, sender: aliceId, text: "hola" },
    ]);

    // Additional Rust-suite pagination coverage.
    await addMessage(account, "2nd message");
    await addMessage(account, "3rd message");
    assert.equal(await view("total_messages"), 4);
    const page = await view("get_messages", { from_index: 2, limit: 2 });
    assert.equal(page[1].premium, false);
    assert.equal(page[1].text, "3rd message");
  } finally {
    await sandbox.tearDown();
  }
});
