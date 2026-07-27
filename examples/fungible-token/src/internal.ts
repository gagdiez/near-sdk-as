import { near, U128 } from "near-sdk-as";
import { state } from "./contract.near.generated";

export function balanceOf(accountId: string): U128 {
  return state.accounts.get(accountId, U128.zero());
}

export function requireRegistered(accountId: string): void {
  assert(state.accounts.has(accountId), "The account " + accountId + " is not registered");
}

export function register(accountId: string): void {
  assert(!state.accounts.has(accountId), "The account is already registered");
  state.accounts.set(accountId, U128.zero());
}

export function deposit(accountId: string, amount: U128): void {
  requireRegistered(accountId);
  const next = balanceOf(accountId).checkedAdd(amount);
  assert(next != null, "Balance overflow");
  state.accounts.set(accountId, next!);
}

export function withdraw(accountId: string, amount: U128): void {
  requireRegistered(accountId);
  const next = balanceOf(accountId).checkedSub(amount);
  assert(next != null, "The account doesn't have enough balance");
  state.accounts.set(accountId, next!);
}

export function transfer(senderId: string, receiverId: string, amount: U128, memo: string = ""): void {
  assert(senderId != receiverId, "Sender and receiver should be different");
  assert(!amount.isZero(), "The amount should be a positive number");
  withdraw(senderId, amount);
  deposit(receiverId, amount);
  let event = "EVENT_JSON:{\"standard\":\"nep141\",\"version\":\"1.0.0\",\"event\":\"ft_transfer\",\"data\":[{\"old_owner_id\":\"" + senderId + "\",\"new_owner_id\":\"" + receiverId + "\",\"amount\":\"" + amount.toString() + "\"";
  if (memo.length > 0) event += ",\"memo\":\"" + memo + "\"";
  near.log(event + "}]}");
}

export function min(left: U128, right: U128): U128 {
  return left.lessThanOrEqual(right) ? left : right;
}

export function isDecimal(value: string): bool {
  if (value.length == 0) return false;
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code < 48 || code > 57) return false;
  }
  return true;
}
