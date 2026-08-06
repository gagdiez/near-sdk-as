import { assertOneYocto, JSON, Promise } from "near-sdk-as";
import { AccountId } from "near-sdk-as/account-id";
import * as collections from "near-sdk-as";
import * as approval from "./approval";
import * as enumeration from "./enumeration";
import * as mint from "./mint";
import { Approval, JsonToken, metadata, NFTContractMetadata, OwnerTokens, Token, TokenId, TokenMetadata } from "./metadata";
import * as nftCore from "./nft_core";

export { Approval, JsonToken, NFTContractMetadata, TokenMetadata } from "./metadata";

@contract_state({ panicOnDefault: true })
export class State {
  owner_id!: AccountId;
  metadata!: NFTContractMetadata;
  tokens_per_owner!: collections.LookupMap<string, OwnerTokens>;
  tokens_by_id!: collections.LookupMap<TokenId, Token>;
  token_metadata_by_id!: collections.LookupMap<TokenId, TokenMetadata>;
  all_token_ids!: collections.Vector<TokenId>;
}

@init
export function init(owner_id: AccountId, metadata: NFTContractMetadata): void {
  assert(metadata.name.length > 0 && metadata.symbol.length > 0, "Metadata name and symbol are required");
  state.owner_id = owner_id;
  state.metadata = metadata;
}

@init
export function new_default_meta(owner_id: AccountId): void {
  const metadata = new NFTContractMetadata();
  metadata.name = "NFT Tutorial Contract";
  metadata.symbol = "GOTEAM";
  state.owner_id = owner_id;
  state.metadata = metadata;
}

@call({ payable: true })
export function nft_mint(token_id: string, token_owner_id: AccountId, token_metadata: TokenMetadata, perpetual_royalties: JSON.Obj | null = null): void {
  mint.mint(token_id, token_owner_id.toString(), token_metadata);
}

@call({ payable: true })
export function nft_transfer(receiver_id: AccountId, token_id: string, approval_id: string = "", memo: string = ""): void {
  assertOneYocto();
  nftCore.transfer(receiver_id.toString(), token_id, approval_id, memo);
}

@call({ payable: true })
export function nft_transfer_call(receiver_id: AccountId, token_id: string, approval_id: string = "", memo: string = "", msg: string = ""): Promise {
  assertOneYocto();
  return nftCore.transferCall(receiver_id.toString(), token_id, approval_id, memo, msg);
}

@call({ privateMethod: true })
export function nft_resolve_transfer(authorized_id: string, previous_owner_id: string, receiver_id: string, token_id: string, approved_account_ids: Approval[] = [], memo: string = ""): bool {
  return nftCore.resolveTransfer(authorized_id, previous_owner_id, receiver_id, token_id, approved_account_ids, memo);
}

@call({ payable: true })
export function nft_approve(token_id: string, account_id: AccountId, msg: string = ""): u64 {
  return approval.approve(token_id, account_id.toString());
}

@call({ payable: true })
export function nft_revoke(token_id: string, account_id: AccountId): void { approval.revoke(token_id, account_id.toString()); }

@call({ payable: true })
export function nft_revoke_all(token_id: string): void { approval.revokeAll(token_id); }

@view
export function nft_is_approved(token_id: string, approved_account_id: AccountId, approval_id: string = ""): bool {
  return approval.isApproved(token_id, approved_account_id.toString(), approval_id);
}

@view
export function nft_token(token_id: string): JsonToken | null { return nftCore.token(token_id); }

@view
export function nft_total_supply(): string { return enumeration.totalSupply().toString(); }

@view
export function nft_tokens(from_index: u32 = 0, limit: u32 = 50): JsonToken[] { return enumeration.tokens(from_index, limit); }

@view
export function nft_supply_for_owner(account_id: AccountId): string { return enumeration.supplyForOwner(account_id.toString()).toString(); }

@view
export function nft_tokens_for_owner(account_id: AccountId, from_index: u32 = 0, limit: u32 = 50): JsonToken[] {
  return enumeration.tokensForOwner(account_id.toString(), from_index, limit);
}

@view
export function nft_metadata(): NFTContractMetadata { return metadata(); }
