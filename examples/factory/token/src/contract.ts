import { AccountId, assertOneYocto, near, UInt128 } from "near-sdk-as";

@json
export class TokenMetadata {
  spec: string;
  name: string;
  symbol: string;
  decimals: u8;
  icon: string | null;
  reference: string | null;
  reference_hash: string | null;

  constructor(spec: string = "", name: string = "", symbol: string = "", decimals: u8 = 0, icon: string | null = null, reference: string | null = null, reference_hash: string | null = null) {
    this.spec = spec;
    this.name = name;
    this.symbol = symbol;
    this.decimals = decimals;
    this.icon = icon;
    this.reference = reference;
    this.reference_hash = reference_hash;
  }
}

@json
class Balance {
  account_id: AccountId;
  amount: UInt128;

  constructor(account_id: AccountId, amount: UInt128) {
    this.account_id = account_id;
    this.amount = amount;
  }
}

@contract_state({ panicOnDefault: true })
export class State {
  owner_id!: AccountId;
  total_supply!: UInt128;
  metadata!: TokenMetadata;
  balances!: Balance[];
}

function balanceIndex(accountId: string): i32 {
  for (let i = 0; i < state.balances.length; i++) {
    if (state.balances[i].account_id.toString() == accountId) return i;
  }
  return -1;
}

@init
export function initialize(
  owner_id: AccountId,
  total_supply: UInt128,
  metadata: TokenMetadata
): void {
  state.owner_id = owner_id;
  state.total_supply = total_supply;
  state.metadata = metadata;
  state.balances = [new Balance(owner_id, total_supply)];
}

@view
export function ft_metadata(): TokenMetadata {
  return state.metadata;
}

@view
export function ft_total_supply(): string {
  return state.total_supply.toString();
}

@view
export function ft_balance_of(account_id: AccountId): string {
  const index = balanceIndex(account_id.toString());
  return index < 0 ? "0" : state.balances[index].amount.toString();
}

@call({ payable: true })
export function storage_deposit(account_id: AccountId | null = null): void {
  const account = account_id == null ? near.predecessorAccountId() : account_id.toString();
  if (balanceIndex(account) < 0) {
    state.balances.push(new Balance(AccountId.fromString(account), UInt128.zero()));
  }
}

@call({ payable: true })
export function ft_transfer(receiver_id: AccountId, amount: UInt128): void {
  assertOneYocto();
  const senderIndex = balanceIndex(near.predecessorAccountId());
  const receiverIndex = balanceIndex(receiver_id.toString());
  assert(senderIndex >= 0, "Sender is not registered");
  assert(receiverIndex >= 0, "Receiver is not registered");

  const senderBalance = state.balances[senderIndex].amount.checkedSub(amount);
  assert(senderBalance != null, "Insufficient balance");
  state.balances[senderIndex].amount = senderBalance!;

  const receiverBalance = state.balances[receiverIndex].amount.checkedAdd(amount);
  assert(receiverBalance != null, "Balance overflow");
  state.balances[receiverIndex].amount = receiverBalance!;
}
