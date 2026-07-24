import { JSON } from "near-sdk-as";
import { state } from "./lib.near.generated";

export type TokenId = string;

@json
export class NFTContractMetadata {
  spec: string = "nft-1.0.0";
  name: string = "";
  symbol: string = "";
  icon: string | null = null;
  base_uri: string | null = null;
  reference: string | null = null;
  reference_hash: string | null = null;
}

@json
export class TokenMetadata {
  title: string | null = null;
  description: string | null = null;
  media: string | null = null;
  media_hash: string | null = null;
  copies: string | null = null;
  issued_at: string | null = null;
  expires_at: string | null = null;
  starts_at: string | null = null;
  updated_at: string | null = null;
  extra: string | null = null;
  reference: string | null = null;
  reference_hash: string | null = null;
}

@json
export class Approval {
  account_id: string = "";
  approval_id: u64 = 0;

  constructor(account_id: string = "", approval_id: u64 = 0) {
    this.account_id = account_id;
    this.approval_id = approval_id;
  }
}

@json
export class Token {
  owner_id: string = "";
  approved_account_ids: Approval[] = [];
  next_approval_id: u64 = 0;
}

@json
export class OwnerTokens {
  token_ids: TokenId[] = [];
}

@json
export class JsonToken {
  token_id: TokenId = "";
  owner_id: string = "";
  metadata: TokenMetadata = new TokenMetadata();
  approved_account_ids: JSON.Obj | null = null;
}

@json
export class TransferCallArgs {
  sender_id: string = "";
  previous_owner_id: string = "";
  token_id: TokenId = "";
  msg: string = "";
}

@json
export class ResolveTransferArgs {
  authorized_id: string = "";
  previous_owner_id: string = "";
  receiver_id: string = "";
  token_id: TokenId = "";
  approved_account_ids: Approval[] = [];
  memo: string = "";
}

export function metadata(): NFTContractMetadata { return state.metadata; }
