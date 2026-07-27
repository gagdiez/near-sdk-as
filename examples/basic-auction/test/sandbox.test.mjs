import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { Account, JsonRpcProvider, KeyPairSigner } from "near-api-js";
import { DEFAULT_ACCOUNT_ID, DEFAULT_PRIVATE_KEY, Sandbox } from "near-sandbox";

const ONE_NEAR = 1_000_000_000_000_000_000_000_000n;
const MAX_GAS = 150_000_000_000_000n;

async function deployAuction(endTime) {
  const sandbox = await Sandbox.start({});
  const provider = new JsonRpcProvider({ url: sandbox.rpcUrl });
  const signer = KeyPairSigner.fromSecretKey(DEFAULT_PRIVATE_KEY);
  const contract = new Account(DEFAULT_ACCOUNT_ID, provider, signer);
  const publicKey = await signer.getPublicKey();
  const auctioneerId = `auctioneer.${DEFAULT_ACCOUNT_ID}`;
  await contract.createSubAccount({ accountOrPrefix: "auctioneer", publicKey, nearToTransfer: 10n * ONE_NEAR });
  await contract.deployContract(new Uint8Array(await readFile(new URL("../build/contract.wasm", import.meta.url))));
  await contract.callFunction({
    contractId: DEFAULT_ACCOUNT_ID,
    methodName: "init",
    args: { end_time: endTime, auctioneer: auctioneerId },
  });
  return { sandbox, provider, signer, contract, auctioneerId };
}

test("rejects public methods before initialization", { timeout: 120_000 }, async () => {
  const sandbox = await Sandbox.start({});
  const provider = new JsonRpcProvider({ url: sandbox.rpcUrl });
  const signer = KeyPairSigner.fromSecretKey(DEFAULT_PRIVATE_KEY);
  const contract = new Account(DEFAULT_ACCOUNT_ID, provider, signer);
  try {
    await contract.deployContract(new Uint8Array(await readFile(new URL("../build/contract.wasm", import.meta.url))));
    await assert.rejects(provider.callFunction({
      contractId: DEFAULT_ACCOUNT_ID,
      method: "get_auctioneer",
      args: {},
    }));
    await assert.rejects(contract.callFunction({
      contractId: DEFAULT_ACCOUNT_ID,
      methodName: "bid",
      args: {},
      deposit: ONE_NEAR,
      gas: MAX_GAS,
    }));
  } finally {
    await sandbox.tearDown();
  }
});

test("refunds higher bids and lets the auctioneer claim once after the deadline", { timeout: 120_000 }, async () => {
  const endTime = (BigInt(Date.now() + 60_000) * 1_000_000n).toString();
  const { sandbox, provider, signer, contract, auctioneerId } = await deployAuction(endTime);
  try {
    const publicKey = await signer.getPublicKey();
    const aliceId = `alice.${DEFAULT_ACCOUNT_ID}`;
    const bobId = `bob.${DEFAULT_ACCOUNT_ID}`;
    for (const accountOrPrefix of ["alice", "bob"]) {
      await contract.createSubAccount({ accountOrPrefix, publicKey, nearToTransfer: 10n * ONE_NEAR });
    }
    const alice = new Account(aliceId, provider, signer);
    const bob = new Account(bobId, provider, signer);
    assert.equal(await provider.callFunction({ contractId: DEFAULT_ACCOUNT_ID, method: "get_auctioneer", args: {} }), auctioneerId);
    assert.deepEqual(await provider.callFunction({ contractId: DEFAULT_ACCOUNT_ID, method: "get_highest_bid", args: {} }), {
      bidder: DEFAULT_ACCOUNT_ID,
      bid: "1",
    });

    await alice.callFunction({ contractId: DEFAULT_ACCOUNT_ID, methodName: "bid", args: {}, deposit: ONE_NEAR, gas: MAX_GAS, waitUntil: "FINAL" });
    const aliceBeforeRefund = BigInt((await provider.viewAccount({ accountId: aliceId, blockQuery: { finality: "final" } })).amount);
    await bob.callFunction({ contractId: DEFAULT_ACCOUNT_ID, methodName: "bid", args: {}, deposit: 2n * ONE_NEAR, gas: MAX_GAS, waitUntil: "FINAL" });
    assert.deepEqual(await provider.callFunction({ contractId: DEFAULT_ACCOUNT_ID, method: "get_highest_bid", args: {} }), {
      bidder: bobId,
      bid: (2n * ONE_NEAR).toString(),
    });
    const aliceAfterRefund = BigInt((await provider.viewAccount({ accountId: aliceId, blockQuery: { finality: "final" } })).amount);
    assert.equal(aliceAfterRefund - aliceBeforeRefund, ONE_NEAR);
    await assert.rejects(alice.callFunction({ contractId: DEFAULT_ACCOUNT_ID, methodName: "bid", args: {}, deposit: ONE_NEAR }));
    await assert.rejects(contract.callFunction({ contractId: DEFAULT_ACCOUNT_ID, methodName: "claim", args: {}, gas: MAX_GAS }));

    // `near-sandbox` exposes the custom RPC even though its JS wrapper does
    // not yet provide a dedicated convenience method.
    await provider.sendJsonRpc("sandbox_fast_forward", { delta_height: 200 });
    const auctioneer = new Account(auctioneerId, provider, signer);
    const auctioneerBefore = BigInt((await provider.viewAccount({ accountId: auctioneerId, blockQuery: { finality: "final" } })).amount);
    await auctioneer.callFunction({ contractId: DEFAULT_ACCOUNT_ID, methodName: "claim", args: {}, gas: MAX_GAS, waitUntil: "FINAL" });
    const auctioneerAfter = BigInt((await provider.viewAccount({ accountId: auctioneerId, blockQuery: { finality: "final" } })).amount);
    assert.ok(auctioneerAfter - auctioneerBefore > ONE_NEAR, "auctioneer did not receive the winning bid");
    assert.equal(await provider.callFunction({ contractId: DEFAULT_ACCOUNT_ID, method: "get_claimed", args: {} }), true);
    await assert.rejects(auctioneer.callFunction({ contractId: DEFAULT_ACCOUNT_ID, methodName: "claim", args: {}, gas: MAX_GAS }));
    await assert.rejects(alice.callFunction({ contractId: DEFAULT_ACCOUNT_ID, methodName: "bid", args: {}, deposit: 3n * ONE_NEAR }));
  } finally {
    await sandbox.tearDown();
  }
});
