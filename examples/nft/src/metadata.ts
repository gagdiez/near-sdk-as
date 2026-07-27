import { JSON } from "near-sdk-as";
import { state } from "./lib.near.generated";

export type TokenId = string;

@json
export class NFTContractMetadata {
  spec: string;
  name: string;
  symbol: string;
  icon: string | null;
  base_uri: string | null;
  reference: string | null;
  reference_hash: string | null;

  constructor(spec: string = "nft-1.0.0", name: string = "", symbol: string = "", icon: string | null = null, base_uri: string | null = null, reference: string | null = null, reference_hash: string | null = null) {
    this.spec = spec; this.name = name; this.symbol = symbol; this.icon = icon;
    this.base_uri = base_uri; this.reference = reference; this.reference_hash = reference_hash;
  }
}

@json
export class TokenMetadata {
  title: string | null;
  description: string | null;
  media: string | null;
  media_hash: string | null;
  copies: string | null;
  issued_at: string | null;
  expires_at: string | null;
  starts_at: string | null;
  updated_at: string | null;
  extra: string | null;
  reference: string | null;
  reference_hash: string | null;

  constructor(title: string | null = null, description: string | null = null, media: string | null = null, media_hash: string | null = null, copies: string | null = null, issued_at: string | null = null, expires_at: string | null = null, starts_at: string | null = null, updated_at: string | null = null, extra: string | null = null, reference: string | null = null, reference_hash: string | null = null) {
    this.title = title; this.description = description; this.media = media; this.media_hash = media_hash;
    this.copies = copies; this.issued_at = issued_at; this.expires_at = expires_at; this.starts_at = starts_at;
    this.updated_at = updated_at; this.extra = extra; this.reference = reference; this.reference_hash = reference_hash;
  }
}

@json
export class Approval {
  account_id: string;
  approval_id: u64;

  constructor(account_id: string, approval_id: u64) {
    this.account_id = account_id;
    this.approval_id = approval_id;
  }
}

@json
export class Token {
  owner_id: string;
  approved_account_ids: Approval[];
  next_approval_id: u64;

  constructor(owner_id: string, approved_account_ids: Approval[], next_approval_id: u64) {
    this.owner_id = owner_id;
    this.approved_account_ids = approved_account_ids;
    this.next_approval_id = next_approval_id;
  }
}

@json
export class OwnerTokens {
  token_ids: TokenId[];

  constructor(token_ids: TokenId[]) { this.token_ids = token_ids; }
}

@json
export class JsonToken {
  token_id: TokenId;
  owner_id: string;
  metadata: TokenMetadata;
  approved_account_ids: JSON.Obj | null;

  constructor(token_id: TokenId, owner_id: string, metadata: TokenMetadata, approved_account_ids: JSON.Obj | null) {
    this.token_id = token_id; this.owner_id = owner_id; this.metadata = metadata; this.approved_account_ids = approved_account_ids;
  }
}

@json
export class TransferCallArgs {
  sender_id: string;
  previous_owner_id: string;
  token_id: TokenId;
  msg: string;

  constructor(sender_id: string, previous_owner_id: string, token_id: TokenId, msg: string) {
    this.sender_id = sender_id; this.previous_owner_id = previous_owner_id; this.token_id = token_id; this.msg = msg;
  }
}

@json
export class ResolveTransferArgs {
  authorized_id: string;
  previous_owner_id: string;
  receiver_id: string;
  token_id: TokenId;
  approved_account_ids: Approval[];
  memo: string;

  constructor(authorized_id: string, previous_owner_id: string, receiver_id: string, token_id: TokenId, approved_account_ids: Approval[], memo: string) {
    this.authorized_id = authorized_id; this.previous_owner_id = previous_owner_id; this.receiver_id = receiver_id;
    this.token_id = token_id; this.approved_account_ids = approved_account_ids; this.memo = memo;
  }
}

export function metadata(): NFTContractMetadata { return state.metadata; }
