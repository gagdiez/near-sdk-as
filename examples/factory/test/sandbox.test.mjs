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
const ONE_MILLI_NEAR = 1_000_000_000_000_000_000_000n;
const MAX_GAS = 250_000_000_000_000n;
const TOTAL_SUPPLY = 18_446_744_073_709_551_716n;

test("deploys a token, rejects insufficient deposits, and refunds failed creation", { timeout: 120_000 }, async () => {
  const sandbox = await Sandbox.start({});
  try {
    const provider = new JsonRpcProvider({ url: sandbox.rpcUrl });
    const signer = KeyPairSigner.fromSecretKey(DEFAULT_PRIVATE_KEY);
    const factory = new Account(DEFAULT_ACCOUNT_ID, provider, signer);
    const publicKey = await signer.getPublicKey();

    for (const accountOrPrefix of ["owner", "alice", "bob"]) {
      await factory.createSubAccount({
        accountOrPrefix,
        publicKey,
        nearToTransfer: 10n * ONE_NEAR,
      });
    }

    const owner = new Account(`owner.${DEFAULT_ACCOUNT_ID}`, provider, signer);
    const alice = new Account(`alice.${DEFAULT_ACCOUNT_ID}`, provider, signer);
    const bob = new Account(`bob.${DEFAULT_ACCOUNT_ID}`, provider, signer);
    await factory.deployContract(new Uint8Array(await readFile(
      new URL("../build/contract.wasm", import.meta.url),
    )));

    const tokenArgs = {
      owner_id: owner.accountId,
      total_supply: TOTAL_SUPPLY.toString(),
      metadata: {
        spec: "ft-1.0.0",
        name: "The Something Token",
        symbol: "SOMETHING",
        decimals: 6,
        icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'/%3E",
        reference: null,
        reference_hash: null,
      },
    };
    const required = BigInt(await provider.callFunction({
      contractId: factory.accountId,
      method: "get_required",
      args: { args: tokenArgs },
    }));

    await assert.rejects(alice.callFunction({
      contractId: factory.accountId,
      methodName: "create_token",
      args: { args: tokenArgs },
      deposit: required - 1n,
      gas: MAX_GAS,
      waitUntil: "FINAL",
    }));

    assert.equal(await alice.callFunction({
      contractId: factory.accountId,
      methodName: "create_token",
      args: { args: tokenArgs },
      deposit: required,
      gas: MAX_GAS,
      waitUntil: "FINAL",
    }), true);

    const bobBefore = BigInt((await provider.viewAccount({
      accountId: bob.accountId,
      blockQuery: { finality: "final" },
    })).amount);
    assert.equal(await bob.callFunction({
      contractId: factory.accountId,
      methodName: "create_token",
      args: { args: tokenArgs },
      deposit: required,
      gas: MAX_GAS,
      waitUntil: "FINAL",
    }), false);
    const bobAfter = BigInt((await provider.viewAccount({
      accountId: bob.accountId,
      blockQuery: { finality: "final" },
    })).amount);
    assert.ok(bobBefore - bobAfter < 5n * ONE_MILLI_NEAR, "failed creation must refund deposit");

    const tokenId = `something.${factory.accountId}`;
    const tokenKey = await provider.viewAccessKey({
      accountId: tokenId,
      publicKey,
      finalityQuery: { finality: "final" },
    });
    assert.equal(tokenKey.permission, "FullAccess");
    assert.equal((await provider.callFunction({
      contractId: tokenId,
      method: "ft_metadata",
      args: {},
    })).symbol, "SOMETHING");
    assert.equal(await provider.callFunction({
      contractId: tokenId,
      method: "ft_total_supply",
      args: {},
    }), TOTAL_SUPPLY.toString());
    assert.equal(await provider.callFunction({
      contractId: tokenId,
      method: "ft_balance_of",
      args: { account_id: owner.accountId },
    }), TOTAL_SUPPLY.toString());

    for (const account of [alice, bob]) {
      await account.callFunction({
        contractId: tokenId,
        methodName: "storage_deposit",
        args: { account_id: account.accountId },
        deposit: 250n * ONE_MILLI_NEAR,
      });
    }
    assert.equal(await provider.callFunction({
      contractId: tokenId,
      method: "ft_balance_of",
      args: { account_id: alice.accountId },
    }), "0");

    await owner.callFunction({
      contractId: tokenId,
      methodName: "ft_transfer",
      args: { receiver_id: alice.accountId, amount: "2" },
      deposit: 1n,
    });
    await alice.callFunction({
      contractId: tokenId,
      methodName: "ft_transfer",
      args: { receiver_id: bob.accountId, amount: "1" },
      deposit: 1n,
    });

    assert.equal(await provider.callFunction({
      contractId: tokenId,
      method: "ft_balance_of",
      args: { account_id: alice.accountId },
    }), "1");
    assert.equal(await provider.callFunction({
      contractId: tokenId,
      method: "ft_balance_of",
      args: { account_id: bob.accountId },
    }), "1");
    assert.equal(await provider.callFunction({
      contractId: tokenId,
      method: "ft_balance_of",
      args: { account_id: owner.accountId },
    }), (TOTAL_SUPPLY - 2n).toString());
  } finally {
    await sandbox.tearDown();
  }
});
