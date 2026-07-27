import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { Account, JsonRpcProvider, KeyPairSigner } from "near-api-js";
import {
  DEFAULT_ACCOUNT_ID,
  DEFAULT_PRIVATE_KEY,
  Sandbox,
} from "near-sandbox";

const THIRTY_NEAR = 30_000_000_000_000_000_000_000_000n;

test("scores repeated guesses against deterministic random outcomes", { timeout: 120_000 }, async () => {
  const sandbox = await Sandbox.start({});
  try {
    const provider = new JsonRpcProvider({ url: sandbox.rpcUrl });
    const signer = KeyPairSigner.fromSecretKey(DEFAULT_PRIVATE_KEY);
    const contractAccount = new Account(DEFAULT_ACCOUNT_ID, provider, signer);
    const playerId = `alice.${DEFAULT_ACCOUNT_ID}`;
    await contractAccount.createSubAccount({
      accountOrPrefix: "alice",
      publicKey: await signer.getPublicKey(),
      nearToTransfer: THIRTY_NEAR,
    });

    const player = new Account(playerId, provider, signer);
    const wasm = new Uint8Array(await readFile(
      new URL("../build/contract.wasm", import.meta.url),
    ));
    await contractAccount.deployContract(wasm);

    const pointsOf = () => provider.callFunction({
      contractId: DEFAULT_ACCOUNT_ID,
      method: "points_of",
      args: { player: playerId },
    });

    assert.equal(await pointsOf(), 0);

    let tails = 0;
    let heads = 0;
    let expectedPoints = 0;
    for (let iteration = 0; iteration < 10; iteration++) {
      const outcome = await player.callFunction({
        contractId: DEFAULT_ACCOUNT_ID,
        methodName: "flip_coin",
        args: { player_guess: "heads" },
      });
      if (outcome === "heads") {
        heads += 1;
        expectedPoints += 1;
      } else {
        tails += 1;
        if (expectedPoints > 0) expectedPoints -= 1;
      }
    }

    assert.ok(heads >= 2);
    assert.ok(tails >= 2);
    assert.equal(await pointsOf(), expectedPoints);
  } finally {
    await sandbox.tearDown();
  }
});
