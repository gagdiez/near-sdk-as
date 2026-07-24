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

test("initializes once, forwards donations, and tracks donors", { timeout: 120_000 }, async () => {
  const sandbox = await Sandbox.start({});
  try {
    const provider = new JsonRpcProvider({ url: sandbox.rpcUrl });
    const signer = KeyPairSigner.fromSecretKey(DEFAULT_PRIVATE_KEY);
    const contractAccount = new Account(DEFAULT_ACCOUNT_ID, provider, signer);
    const publicKey = await signer.getPublicKey();
    const beneficiaryId = `beneficiary.${DEFAULT_ACCOUNT_ID}`;
    const donorAId = `donor-a.${DEFAULT_ACCOUNT_ID}`;
    const donorBId = `donor-b.${DEFAULT_ACCOUNT_ID}`;

    for (const accountOrPrefix of ["beneficiary", "donor-a", "donor-b"]) {
      await contractAccount.createSubAccount({
        accountOrPrefix,
        publicKey,
        nearToTransfer: 5n * ONE_NEAR,
      });
    }

    const donorA = new Account(donorAId, provider, signer);
    const donorB = new Account(donorBId, provider, signer);
    const wasm = new Uint8Array(await readFile(
      new URL("./build/contract.wasm", import.meta.url),
    ));
    await contractAccount.deployContract(wasm);
    await contractAccount.callFunction({
      contractId: DEFAULT_ACCOUNT_ID,
      methodName: "init",
      args: { beneficiary: beneficiaryId },
    });
    await assert.rejects(contractAccount.callFunction({
      contractId: DEFAULT_ACCOUNT_ID,
      methodName: "init",
      args: { beneficiary: donorAId },
    }));

    const view = (method, args = {}) => provider.callFunction({
      contractId: DEFAULT_ACCOUNT_ID,
      method,
      args,
    });
    const beneficiaryBefore = BigInt((await provider.viewAccount({
      accountId: beneficiaryId,
      blockQuery: { finality: "final" },
    })).amount);

    assert.equal(await view("get_beneficiary"), beneficiaryId);
    await assert.rejects(donorA.callFunction({
      contractId: DEFAULT_ACCOUNT_ID,
      methodName: "change_beneficiary",
      args: { new_beneficiary: donorAId },
    }));

    assert.equal(await donorA.callFunction({
      contractId: DEFAULT_ACCOUNT_ID,
      methodName: "donate",
      args: {},
      deposit: ONE_NEAR,
      waitUntil: "FINAL",
    }), ONE_NEAR.toString());
    const beneficiaryAfterFirstDonation = BigInt((await provider.viewAccount({
      accountId: beneficiaryId,
      blockQuery: { finality: "final" },
    })).amount);
    assert.equal(
      beneficiaryAfterFirstDonation - beneficiaryBefore,
      ONE_NEAR - ONE_MILLI_NEAR,
    );
    await donorB.callFunction({
      contractId: DEFAULT_ACCOUNT_ID,
      methodName: "donate",
      args: {},
      deposit: 2n * ONE_NEAR,
      waitUntil: "FINAL",
    });
    assert.equal(await donorA.callFunction({
      contractId: DEFAULT_ACCOUNT_ID,
      methodName: "donate",
      args: {},
      deposit: ONE_NEAR,
      waitUntil: "FINAL",
    }), (2n * ONE_NEAR).toString());

    assert.equal(await view("number_of_donors"), "2");
    assert.deepEqual(await view("get_donation_for_account", { account_id: donorAId }), {
      account_id: donorAId,
      total_amount: (2n * ONE_NEAR).toString(),
    });
    assert.deepEqual(await view("get_donations", { from_index: 1, limit: 1 }), [{
      account_id: donorBId,
      total_amount: (2n * ONE_NEAR).toString(),
    }]);

    const beneficiaryAfter = BigInt((await provider.viewAccount({
      accountId: beneficiaryId,
      blockQuery: { finality: "final" },
    })).amount);
    assert.equal(
      beneficiaryAfter - beneficiaryBefore,
      4n * ONE_NEAR - 2n * ONE_MILLI_NEAR,
    );
  } finally {
    await sandbox.tearDown();
  }
});
