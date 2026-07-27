import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { Account, JsonRpcProvider, KeyPairSigner } from "near-api-js";
import { DEFAULT_ACCOUNT_ID, DEFAULT_PRIVATE_KEY, Sandbox } from "near-sandbox";

const ONE_NEAR = 1_000_000_000_000_000_000_000_000n;
const ONE_YOCTO = 1n;
const TUTORIAL_MINT_DEPOSIT = 80_000_000_000_000_000_000_000n;
const MAX_GAS = 150_000_000_000_000n;

const metadata = (title) => ({
  title,
  description: `Description for ${title}`,
  media: null,
  media_hash: null,
  copies: null,
  issued_at: null,
  expires_at: null,
  starts_at: null,
  updated_at: null,
  extra: null,
  reference: null,
  reference_hash: null,
});

test("does not expose undecorated module helpers as contract methods", { timeout: 120_000 }, async () => {
  const sandbox = await Sandbox.start({});
  try {
    const provider = new JsonRpcProvider({ url: sandbox.rpcUrl });
    const signer = KeyPairSigner.fromSecretKey(DEFAULT_PRIVATE_KEY);
    const account = new Account(DEFAULT_ACCOUNT_ID, provider, signer);
    await account.deployContract(new Uint8Array(await readFile(
      new URL("../build/contract.wasm", import.meta.url),
    )));

    // `mint` is exported from src/mint.ts for src/lib.ts to import. Only
    // decorated functions in src/lib.ts become Wasm entry points.
    await assert.rejects(account.callFunction({
      contractId: DEFAULT_ACCOUNT_ID,
      methodName: "mint",
      args: {},
    }));
  } finally {
    await sandbox.tearDown();
  }
});

test("mints, enumerates, approves, transfers, revokes, and resolves transfer calls", { timeout: 120_000 }, async () => {
  const sandbox = await Sandbox.start({});
  try {
    const provider = new JsonRpcProvider({ url: sandbox.rpcUrl });
    const signer = KeyPairSigner.fromSecretKey(DEFAULT_PRIVATE_KEY);
    const nft = new Account(DEFAULT_ACCOUNT_ID, provider, signer);
    const publicKey = await signer.getPublicKey();
    const aliceId = `alice.${DEFAULT_ACCOUNT_ID}`;
    const bobId = `bob.${DEFAULT_ACCOUNT_ID}`;
    const receiverId = `receiver.${DEFAULT_ACCOUNT_ID}`;
    for (const accountOrPrefix of ["alice", "bob", "receiver"]) {
      await nft.createSubAccount({ accountOrPrefix, publicKey, nearToTransfer: 30n * ONE_NEAR });
    }
    const alice = new Account(aliceId, provider, signer);
    const bob = new Account(bobId, provider, signer);
    const receiver = new Account(receiverId, provider, signer);
    await nft.deployContract(new Uint8Array(await readFile(new URL("../build/contract.wasm", import.meta.url))));
    await receiver.deployContract(new Uint8Array(await readFile(
      new URL("../test-contracts/token-receiver/build/contract.wasm", import.meta.url),
    )));

    await nft.callFunction({
      contractId: DEFAULT_ACCOUNT_ID,
      methodName: "new_default_meta",
      args: { owner_id: DEFAULT_ACCOUNT_ID },
    });
    assert.deepEqual(
      await provider.callFunction({ contractId: DEFAULT_ACCOUNT_ID, method: "nft_metadata", args: {} }),
      {
        base_uri: null,
        icon: null,
        name: "NFT Tutorial Contract",
        reference: null,
        reference_hash: null,
        spec: "nft-1.0.0",
        symbol: "GOTEAM",
      },
    );

    // The tutorial deliberately permits any account to mint when it attaches
    // storage deposit; this is not an owner-only minting contract.
    await alice.callFunction({
      contractId: DEFAULT_ACCOUNT_ID,
      methodName: "nft_mint",
      args: {
        token_id: "tutorial-1",
        token_owner_id: aliceId,
        token_metadata: {
          title: "LEEROYYYMMMJENKINSSS",
          description: "Alright time's up, let's do this.",
          media: "https://example.com/leeroy.png",
        },
      },
      deposit: TUTORIAL_MINT_DEPOSIT,
    });
    const tutorialToken = (await provider.callFunction({ contractId: DEFAULT_ACCOUNT_ID, method: "nft_tokens", args: {} }))[0];
    assert.equal(tutorialToken.token_id, "tutorial-1");
    assert.equal(tutorialToken.owner_id, aliceId);
    assert.deepEqual(tutorialToken.approved_account_ids, {});
    assert.equal(tutorialToken.metadata.title, "LEEROYYYMMMJENKINSSS");

    const mint = (tokenId, ownerId = DEFAULT_ACCOUNT_ID) => nft.callFunction({
      contractId: DEFAULT_ACCOUNT_ID,
      methodName: "nft_mint",
      args: { token_id: tokenId, token_owner_id: ownerId, token_metadata: metadata(tokenId) },
    });
    await mint("id-0");
    await mint("id-1");
    await mint("id-2", aliceId);

    assert.equal(await provider.callFunction({ contractId: DEFAULT_ACCOUNT_ID, method: "nft_total_supply", args: {} }), "4");
    assert.deepEqual(
      (await provider.callFunction({ contractId: DEFAULT_ACCOUNT_ID, method: "nft_tokens", args: { from_index: 1, limit: 2 } })).map((token) => token.token_id),
      ["id-0", "id-1"],
    );
    assert.equal(await provider.callFunction({ contractId: DEFAULT_ACCOUNT_ID, method: "nft_supply_for_owner", args: { account_id: aliceId } }), "2");
    assert.deepEqual(
      (await provider.callFunction({ contractId: DEFAULT_ACCOUNT_ID, method: "nft_tokens_for_owner", args: { account_id: aliceId } })).map((token) => token.token_id),
      ["tutorial-1", "id-2"],
    );

    await nft.callFunction({
      contractId: DEFAULT_ACCOUNT_ID,
      methodName: "nft_transfer",
      args: { receiver_id: aliceId, token_id: "id-0", memo: "simple transfer" },
      deposit: ONE_YOCTO,
    });
    assert.equal((await provider.callFunction({ contractId: DEFAULT_ACCOUNT_ID, method: "nft_token", args: { token_id: "id-0" } })).owner_id, aliceId);

    await mint("id-3");
    await nft.callFunction({
      contractId: DEFAULT_ACCOUNT_ID,
      methodName: "nft_approve",
      args: { token_id: "id-3", account_id: bobId },
      deposit: ONE_YOCTO,
    });
    assert.equal(await provider.callFunction({ contractId: DEFAULT_ACCOUNT_ID, method: "nft_is_approved", args: { token_id: "id-3", approved_account_id: bobId, approval_id: "0" } }), true);
    assert.equal((await provider.callFunction({ contractId: DEFAULT_ACCOUNT_ID, method: "nft_token", args: { token_id: "id-3" } })).approved_account_ids[bobId], 0);
    await bob.callFunction({
      contractId: DEFAULT_ACCOUNT_ID,
      methodName: "nft_transfer",
      args: { receiver_id: aliceId, token_id: "id-3", approval_id: "0" },
      deposit: ONE_YOCTO,
    });
    assert.equal((await provider.callFunction({ contractId: DEFAULT_ACCOUNT_ID, method: "nft_token", args: { token_id: "id-3" } })).owner_id, aliceId);

    await mint("id-4");
    assert.equal(await nft.callFunction({
      contractId: DEFAULT_ACCOUNT_ID,
      methodName: "nft_transfer_call",
      args: { receiver_id: receiverId, token_id: "id-4", msg: "return-it" },
      deposit: ONE_YOCTO,
      gas: MAX_GAS,
      waitUntil: "FINAL",
    }), false);
    assert.equal((await provider.callFunction({ contractId: DEFAULT_ACCOUNT_ID, method: "nft_token", args: { token_id: "id-4" } })).owner_id, DEFAULT_ACCOUNT_ID);

    await mint("id-5");
    await nft.callFunction({ contractId: DEFAULT_ACCOUNT_ID, methodName: "nft_approve", args: { token_id: "id-5", account_id: bobId }, deposit: ONE_YOCTO });
    await nft.callFunction({ contractId: DEFAULT_ACCOUNT_ID, methodName: "nft_revoke", args: { token_id: "id-5", account_id: bobId }, deposit: ONE_YOCTO });
    assert.equal(await provider.callFunction({ contractId: DEFAULT_ACCOUNT_ID, method: "nft_is_approved", args: { token_id: "id-5", approved_account_id: bobId } }), false);
    await nft.callFunction({ contractId: DEFAULT_ACCOUNT_ID, methodName: "nft_approve", args: { token_id: "id-5", account_id: aliceId }, deposit: ONE_YOCTO });
    await nft.callFunction({ contractId: DEFAULT_ACCOUNT_ID, methodName: "nft_approve", args: { token_id: "id-5", account_id: bobId }, deposit: ONE_YOCTO });
    await nft.callFunction({ contractId: DEFAULT_ACCOUNT_ID, methodName: "nft_revoke_all", args: { token_id: "id-5" }, deposit: ONE_YOCTO });
    assert.equal(await provider.callFunction({ contractId: DEFAULT_ACCOUNT_ID, method: "nft_is_approved", args: { token_id: "id-5", approved_account_id: aliceId } }), false);
    assert.equal(await provider.callFunction({ contractId: DEFAULT_ACCOUNT_ID, method: "nft_is_approved", args: { token_id: "id-5", approved_account_id: bobId } }), false);

    await mint("id-6");
    assert.equal(await nft.callFunction({
      contractId: DEFAULT_ACCOUNT_ID,
      methodName: "nft_transfer_call",
      args: { receiver_id: receiverId, token_id: "id-6", msg: "keep-it" },
      deposit: ONE_YOCTO,
      gas: MAX_GAS,
      waitUntil: "FINAL",
    }), true);
    assert.equal((await provider.callFunction({ contractId: DEFAULT_ACCOUNT_ID, method: "nft_token", args: { token_id: "id-6" } })).owner_id, receiverId);
  } finally {
    await sandbox.tearDown();
  }
});
