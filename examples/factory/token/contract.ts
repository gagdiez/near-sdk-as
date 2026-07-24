import { near, U128 } from "near-sdk-as";

@json
export class TokenMetadata {
  spec: string = "";
  name: string = "";
  symbol: string = "";
  decimals: u8 = 0;
  icon: string | null = null;
  reference: string | null = null;
  reference_hash: string | null = null;
}

@json
class Balance {
  account_id: string = "";
  amount: U128 = U128.zero();

  constructor(account_id: string = "", amount: U128 = U128.zero()) {
    this.account_id = account_id;
    this.amount = amount;
  }
}

@contract_state
export class State {
  owner_id: string = "";
  total_supply: U128 = U128.zero();
  metadata: TokenMetadata = new TokenMetadata();
  balances: Balance[] = [];
}

function balanceIndex(accountId: string): i32 {
  for (let i = 0; i < state.balances.length; i++) {
    if (state.balances[i].account_id == accountId) return i;
  }
  return -1;
}

@init
export function initialize(
  owner_id: string,
  total_supply: U128,
  metadata: TokenMetadata
): void {
  state.owner_id = owner_id;
  state.total_supply = total_supply;
  state.metadata = metadata;
  state.balances.push(new Balance(owner_id, total_supply));
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
export function ft_balance_of(account_id: string): string {
  const index = balanceIndex(account_id);
  return index < 0 ? "0" : state.balances[index].amount.toString();
}

@call({ payable: true })
export function storage_deposit(account_id: string = ""): void {
  const account = account_id.length == 0 ? near.predecessorAccountId() : account_id;
  if (balanceIndex(account) < 0) {
    state.balances.push(new Balance(account, U128.zero()));
  }
}

@call({ payable: true })
export function ft_transfer(receiver_id: string, amount: U128): void {
  assert(!near.attachedDeposit().isZero(), "Requires one yoctoNEAR");
  const senderIndex = balanceIndex(near.predecessorAccountId());
  const receiverIndex = balanceIndex(receiver_id);
  assert(senderIndex >= 0, "Sender is not registered");
  assert(receiverIndex >= 0, "Receiver is not registered");

  const senderBalance = state.balances[senderIndex].amount.checkedSub(amount);
  assert(senderBalance != null, "Insufficient balance");
  state.balances[senderIndex].amount = senderBalance!;

  const receiverBalance = state.balances[receiverIndex].amount.checkedAdd(amount);
  assert(receiverBalance != null, "Balance overflow");
  state.balances[receiverIndex].amount = receiverBalance!;
}
