import { NearToken, UInt128 } from "near-sdk-as";

@json
export class FungibleTokenMetadata {
  spec: string;
  name: string;
  symbol: string;
  icon: string | null;
  reference: string | null;
  reference_hash: string | null;
  decimals: u8;

  constructor(spec: string = "ft-1.0.0", name: string = "", symbol: string = "", icon: string | null = null, reference: string | null = null, reference_hash: string | null = null, decimals: u8 = 24) {
    this.spec = spec;
    this.name = name;
    this.symbol = symbol;
    this.icon = icon;
    this.reference = reference;
    this.reference_hash = reference_hash;
    this.decimals = decimals;
  }
}

@json
export class StorageBalance {
  total: NearToken;
  available: NearToken;

  constructor(total: NearToken, available: NearToken) {
    this.total = total;
    this.available = available;
  }
}

@json
export class StorageBalanceBounds {
  min: NearToken;
  max: NearToken;

  constructor(min: NearToken, max: NearToken) {
    this.min = min;
    this.max = max;
  }
}

@json
export class TransferCallArgs {
  sender_id: string;
  amount: string;
  msg: string;

  constructor(sender_id: string, amount: string, msg: string) {
    this.sender_id = sender_id;
    this.amount = amount;
    this.msg = msg;
  }
}

@json
export class ResolveTransferArgs {
  sender_id: string;
  receiver_id: string;
  amount: string;

  constructor(sender_id: string, receiver_id: string, amount: string) {
    this.sender_id = sender_id;
    this.receiver_id = receiver_id;
    this.amount = amount;
  }
}

export function amountToString(amount: UInt128): string {
  return amount.toString();
}
