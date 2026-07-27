import { Approval, TokenId } from "./metadata";
import { assertAtLeastOneYocto } from "./internal";
import { state } from "./lib.near.generated";
import { assertOneYocto, near } from "near-sdk-as";

export function approve(tokenId: TokenId, accountId: string): u64 {
  assertAtLeastOneYocto();
  const token = state.tokens_by_id.getSome(tokenId);
  assert(near.predecessorAccountId() == token.owner_id, "Predecessor must be the token owner.");
  const approvalId = token.next_approval_id;
  let found = -1;
  for (let i = 0; i < token.approved_account_ids.length; i++) {
    if (token.approved_account_ids[i].account_id == accountId) found = i;
  }
  if (found < 0) token.approved_account_ids.push(new Approval(accountId, approvalId));
  else token.approved_account_ids[found] = new Approval(accountId, approvalId);
  token.next_approval_id += 1;
  state.tokens_by_id.set(tokenId, token);
  return approvalId;
}

export function isApproved(tokenId: TokenId, accountId: string, approvalId: string): bool {
  const token = state.tokens_by_id.getSome(tokenId);
  for (let i = 0; i < token.approved_account_ids.length; i++) {
    const approval = token.approved_account_ids[i];
    if (approval.account_id == accountId) return approvalId.length == 0 || approval.approval_id.toString() == approvalId;
  }
  return false;
}

export function revoke(tokenId: TokenId, accountId: string): void {
  assertOneYocto();
  const token = state.tokens_by_id.getSome(tokenId);
  assert(near.predecessorAccountId() == token.owner_id, "Unauthorized");
  for (let i = 0; i < token.approved_account_ids.length; i++) {
    if (token.approved_account_ids[i].account_id == accountId) token.approved_account_ids.splice(i, 1);
  }
  state.tokens_by_id.set(tokenId, token);
}

export function revokeAll(tokenId: TokenId): void {
  assertOneYocto();
  const token = state.tokens_by_id.getSome(tokenId);
  assert(near.predecessorAccountId() == token.owner_id, "Unauthorized");
  token.approved_account_ids = [];
  state.tokens_by_id.set(tokenId, token);
}
