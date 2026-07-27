import { JSON, near } from "near-sdk-as";
import { transferEvent } from "./events";
import { Approval, JsonToken, OwnerTokens, Token, TokenId, TokenMetadata } from "./metadata";
import { state } from "./lib.near.generated";

export function assertAtLeastOneYocto(): void {
  assert(!near.attachedDeposit().isZero(), "Requires attached deposit of at least 1 yoctoNEAR");
}

function ownerTokens(ownerId: string): OwnerTokens {
  return state.tokens_per_owner.get(ownerId, new OwnerTokens());
}

function saveOwnerTokens(ownerId: string, tokens: OwnerTokens): void {
  if (tokens.token_ids.length == 0) state.tokens_per_owner.delete(ownerId);
  else state.tokens_per_owner.set(ownerId, tokens);
}

export function internalAddTokenToOwner(ownerId: string, tokenId: TokenId): void {
  const tokens = ownerTokens(ownerId);
  tokens.token_ids.push(tokenId);
  saveOwnerTokens(ownerId, tokens);
}

export function internalRemoveTokenFromOwner(ownerId: string, tokenId: TokenId): void {
  const tokens = ownerTokens(ownerId);
  const index = tokens.token_ids.indexOf(tokenId);
  assert(index >= 0, "Token should be owned by the sender");
  tokens.token_ids.splice(index, 1);
  saveOwnerTokens(ownerId, tokens);
}

export function approvalObject(values: Approval[]): JSON.Obj | null {
  const result = new JSON.Obj();
  for (let i = 0; i < values.length; i++) result.set(values[i].account_id, values[i].approval_id);
  return result;
}

export function jsonToken(tokenId: TokenId): JsonToken | null {
  if (!state.tokens_by_id.has(tokenId)) return null;
  const token = state.tokens_by_id.getSome(tokenId);
  const result = new JsonToken();
  result.token_id = tokenId;
  result.owner_id = token.owner_id;
  result.metadata = state.token_metadata_by_id.getSome(tokenId);
  result.approved_account_ids = approvalObject(token.approved_account_ids);
  return result;
}

export function internalTransfer(
  senderId: string,
  receiverId: string,
  tokenId: TokenId,
  approvalId: string,
  memo: string,
): Token {
  const token = state.tokens_by_id.getSome(tokenId);
  if (senderId != token.owner_id) {
    let approval: Approval | null = null;
    for (let i = 0; i < token.approved_account_ids.length; i++) {
      if (token.approved_account_ids[i].account_id == senderId) approval = token.approved_account_ids[i];
    }
    assert(approval !== null, "Unauthorized");
    if (approvalId.length > 0) assert(approval!.approval_id.toString() == approvalId, "Approval ID does not match");
  }
  assert(token.owner_id != receiverId, "The token owner and the receiver should be different");

  internalRemoveTokenFromOwner(token.owner_id, tokenId);
  internalAddTokenToOwner(receiverId, tokenId);

  const previous = token;
  const replacement = new Token();
  replacement.owner_id = receiverId;
  replacement.next_approval_id = token.next_approval_id;
  state.tokens_by_id.set(tokenId, replacement);
  transferEvent(previous.owner_id, receiverId, tokenId, senderId == previous.owner_id ? "" : senderId, memo);
  return previous;
}

export function ownerTokenIds(ownerId: string): TokenId[] {
  return ownerTokens(ownerId).token_ids;
}
