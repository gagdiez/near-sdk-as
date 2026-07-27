import { NearToken, U128 } from "near-sdk-as";

@json
export class FungibleTokenMetadata {
  spec: string = "ft-1.0.0";
  name: string = "";
  symbol: string = "";
  icon: string | null = null;
  reference: string | null = null;
  reference_hash: string | null = null;
  decimals: u8 = 24;
}

@json
export class StorageBalance {
  total: NearToken = NearToken.zero();
  available: NearToken = NearToken.zero();
}

@json
export class StorageBalanceBounds {
  min: NearToken = NearToken.zero();
  max: NearToken = NearToken.zero();
}

@json
export class TransferCallArgs {
  sender_id: string = "";
  amount: string = "0";
  msg: string = "";
}

@json
export class ResolveTransferArgs {
  sender_id: string = "";
  receiver_id: string = "";
  amount: string = "0";
}

export function amountToString(amount: U128): string {
  return amount.toString();
}
