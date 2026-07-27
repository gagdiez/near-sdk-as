import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { Account, JsonRpcProvider, KeyPairSigner } from "near-api-js";
import { DEFAULT_ACCOUNT_ID, DEFAULT_PRIVATE_KEY, Sandbox } from "near-sandbox";

const ONE_NEAR = 1_000_000_000_000_000_000_000_000n;
const ONE_YOCTO = 1n;
const STORAGE_BALANCE = 1_250_000_000_000_000_000_000n;
const TOTAL_SUPPLY = 10_000n * ONE_NEAR;
const MAX_GAS = 150_000_000_000_000n;

test("registers accounts, transfers tokens, and resolves transfer-call refunds", { timeout: 120_000 }, async () => {
  const sandbox = await Sandbox.start({});
  try {
    const provider = new JsonRpcProvider({ url: sandbox.rpcUrl });
    const signer = KeyPairSigner.fromSecretKey(DEFAULT_PRIVATE_KEY);
    const token = new Account(DEFAULT_ACCOUNT_ID, provider, signer);
    const publicKey = await signer.getPublicKey();
    const aliceId = `alice.${DEFAULT_ACCOUNT_ID}`;
    const bobId = `bob.${DEFAULT_ACCOUNT_ID}`;
    const receiverId = `receiver.${DEFAULT_ACCOUNT_ID}`;
    for (const accountOrPrefix of ["alice", "bob", "receiver"]) {
      await token.createSubAccount({ accountOrPrefix, publicKey, nearToTransfer: 10n * ONE_NEAR });
    }
    const alice = new Account(aliceId, provider, signer);
    const bob = new Account(bobId, provider, signer);
    const receiver = new Account(receiverId, provider, signer);

    await token.deployContract(new Uint8Array(await readFile(new URL("../build/contract.wasm", import.meta.url))));
    await receiver.deployContract(new Uint8Array(await readFile(
      new URL("../test-contracts/receiver/build/contract.wasm", import.meta.url),
    )));

    const metadata = {
      spec: "ft-1.0.0",
      name: "Example NEAR fungible token",
      symbol: "EXAMPLE",
      decimals: 24,
      icon: null,
      reference: null,
      reference_hash: null,
    };
    await token.callFunction({
      contractId: token.accountId,
      methodName: "init",
      args: { owner_id: token.accountId, total_supply: TOTAL_SUPPLY.toString(), metadata },
    });

    assert.equal(await provider.callFunction({ contractId: token.accountId, method: "ft_total_supply", args: {} }), TOTAL_SUPPLY.toString());
    assert.deepEqual(await provider.callFunction({ contractId: token.accountId, method: "ft_metadata", args: {} }), metadata);
    assert.equal(await provider.callFunction({ contractId: token.accountId, method: "ft_balance_of", args: { account_id: token.accountId } }), TOTAL_SUPPLY.toString());

    const bounds = await provider.callFunction({ contractId: token.accountId, method: "storage_balance_bounds", args: {} });
    assert.deepEqual(bounds, { min: STORAGE_BALANCE.toString(), max: STORAGE_BALANCE.toString() });
    await assert.rejects(bob.callFunction({
      contractId: token.accountId,
      methodName: "storage_deposit",
      args: {},
      deposit: STORAGE_BALANCE - ONE_YOCTO,
      waitUntil: "FINAL",
    }));
    await assert.rejects(bob.callFunction({
      contractId: token.accountId,
      methodName: "storage_deposit",
      args: { account_id: "INVALID!" },
      deposit: STORAGE_BALANCE,
      waitUntil: "FINAL",
    }));
    await alice.callFunction({
      contractId: token.accountId,
      methodName: "storage_deposit",
      args: {},
      deposit: STORAGE_BALANCE + ONE_NEAR,
      waitUntil: "FINAL",
    });
    assert.deepEqual(
      await provider.callFunction({ contractId: token.accountId, method: "storage_balance_of", args: { account_id: aliceId } }),
      { total: STORAGE_BALANCE.toString(), available: "0" },
    );

    await assert.rejects(token.callFunction({
      contractId: token.accountId,
      methodName: "ft_transfer",
      args: { receiver_id: bobId, amount: "1" },
      deposit: ONE_YOCTO,
      waitUntil: "FINAL",
    }));
    await token.callFunction({
      contractId: token.accountId,
      methodName: "ft_transfer",
      args: { receiver_id: aliceId, amount: "100" },
      deposit: ONE_YOCTO,
    });
    assert.equal(await provider.callFunction({ contractId: token.accountId, method: "ft_balance_of", args: { account_id: aliceId } }), "100");

    await token.callFunction({
      contractId: token.accountId,
      methodName: "storage_deposit",
      args: { account_id: receiverId },
      deposit: STORAGE_BALANCE,
    });
    assert.deepEqual(
      await provider.callFunction({
        contractId: token.accountId,
        method: "storage_balance_of",
        args: { account_id: receiverId },
      }),
      { total: STORAGE_BALANCE.toString(), available: "0" },
    );

    assert.equal(await token.callFunction({
      contractId: token.accountId,
      methodName: "ft_transfer_call",
      args: { receiver_id: receiverId, amount: "100", msg: "50" },
      deposit: ONE_YOCTO,
      gas: MAX_GAS,
      waitUntil: "FINAL",
    }), "50");
    assert.equal(await provider.callFunction({ contractId: token.accountId, method: "ft_balance_of", args: { account_id: receiverId } }), "50");

    assert.equal(await token.callFunction({
      contractId: token.accountId,
      methodName: "ft_transfer_call",
      args: { receiver_id: receiverId, amount: "25", msg: "keep" },
      deposit: ONE_YOCTO,
      gas: MAX_GAS,
      waitUntil: "FINAL",
    }), "25");
    assert.equal(await provider.callFunction({ contractId: token.accountId, method: "ft_balance_of", args: { account_id: receiverId } }), "75");
    assert.equal(
      await provider.callFunction({ contractId: token.accountId, method: "ft_balance_of", args: { account_id: token.accountId } }),
      (TOTAL_SUPPLY - 175n).toString(),
    );
  } finally {
    await sandbox.tearDown();
  }
});
