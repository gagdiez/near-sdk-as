import { Gas, near, Promise } from "near-sdk-as";
import { transferEvent } from "./events";
import { internalAddTokenToOwner, internalRemoveTokenFromOwner, internalTransfer, jsonToken } from "./internal";
import { Approval, JsonToken, ResolveTransferArgs, TokenId, TransferCallArgs } from "./metadata";
import { state } from "./lib.near.generated";

const RECEIVER_GAS = Gas.fromTera(25);
const RESOLVE_GAS = Gas.fromTera(10);

export function transfer(receiverId: string, tokenId: TokenId, approvalId: string, memo: string): void {
  const senderId = near.predecessorAccountId();
  internalTransfer(senderId, receiverId, tokenId, approvalId, memo);
}

export function transferCall(
  receiverId: string,
  tokenId: TokenId,
  approvalId: string,
  memo: string,
  msg: string,
): Promise {
  const senderId = near.predecessorAccountId();
  const previous = internalTransfer(senderId, receiverId, tokenId, approvalId, memo);
  const receiverArgs = new TransferCallArgs();
  receiverArgs.sender_id = senderId;
  receiverArgs.previous_owner_id = previous.owner_id;
  receiverArgs.token_id = tokenId;
  receiverArgs.msg = msg;
  const resolveArgs = new ResolveTransferArgs();
  resolveArgs.authorized_id = senderId == previous.owner_id ? "" : senderId;
  resolveArgs.previous_owner_id = previous.owner_id;
  resolveArgs.receiver_id = receiverId;
  resolveArgs.token_id = tokenId;
  resolveArgs.approved_account_ids = previous.approved_account_ids;
  resolveArgs.memo = memo;
  return new Promise(receiverId)
    .callFunction<TransferCallArgs>("nft_on_transfer", receiverArgs, RECEIVER_GAS)
    .then(new Promise(near.currentAccountId()).callFunction<ResolveTransferArgs>("nft_resolve_transfer", resolveArgs, RESOLVE_GAS));
}

export function resolveTransfer(
  authorizedId: string,
  previousOwnerId: string,
  receiverId: string,
  tokenId: TokenId,
  previousApprovals: Approval[],
  memo: string,
): bool {
  let mustReturn = !near.promiseResult().succeeded();
  if (!mustReturn) mustReturn = near.promiseResult().value<bool>();
  if (!mustReturn) return true;
  if (!state.tokens_by_id.has(tokenId)) return true;
  const token = state.tokens_by_id.getSome(tokenId);
  if (token.owner_id != receiverId) return true;

  internalRemoveTokenFromOwner(receiverId, tokenId);
  internalAddTokenToOwner(previousOwnerId, tokenId);
  token.owner_id = previousOwnerId;
  token.approved_account_ids = previousApprovals;
  state.tokens_by_id.set(tokenId, token);
  transferEvent(receiverId, previousOwnerId, tokenId, authorizedId, memo);
  return false;
}

export function token(tokenId: TokenId): JsonToken | null { return jsonToken(tokenId); }
