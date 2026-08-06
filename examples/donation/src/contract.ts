import { near, Promise } from "near-sdk-as";
import { AccountId } from "near-sdk-as/account-id";
import { NearToken } from "near-sdk-as/near-token";

@json
export class Donation {
  account_id: AccountId;
  total_amount: NearToken;

  constructor(account_id: AccountId, total_amount: NearToken) {
    this.account_id = account_id;
    this.total_amount = total_amount;
  }
}

@contract_state({ panicOnDefault: true })
export class State {
  beneficiary!: AccountId;
  donations!: Donation[];
}

function requirePrivate(): void {
  assert(
    near.predecessorAccountId() == near.currentAccountId(),
    "This method is private",
  );
}

function donationIndex(accountId: string): i32 {
  for (let i = 0; i < state.donations.length; i++) {
    if (state.donations[i].account_id.toString() == accountId) return i;
  }
  return -1;
}

@init
export function init(beneficiary: AccountId): void {
  state.beneficiary = beneficiary;
  state.donations = [];
}

@view
export function get_beneficiary(): string {
  return state.beneficiary.toString();
}

@call
export function change_beneficiary(new_beneficiary: AccountId): void {
  requirePrivate();
  state.beneficiary = new_beneficiary;
}

@call({ payable: true })
export function donate(): string {
  const donor = near.predecessorAccountId();
  const donationAmount = near.attachedDeposit();
  const storageCost = NearToken.fromMilliNear(1);
  assert(
    donationAmount.greaterThan(storageCost),
    "Attach more than 1 milliNEAR to cover the storage cost",
  );

  const index = donationIndex(donor);
  const previous = index < 0
    ? NearToken.zero()
    : state.donations[index].total_amount;
  const total = previous.saturatingAdd(donationAmount);
  const toTransfer = index < 0
    ? donationAmount.saturatingSub(storageCost)
    : donationAmount;

  if (index < 0) {
    state.donations.push(new Donation(AccountId.fromString(donor), total));
  }
  else state.donations[index].total_amount = total;

  near.log(
    "Thank you " + donor + " for donating " + donationAmount.toString() +
    "! You donated a total of " + total.toString(),
  );
  new Promise(state.beneficiary.toString()).transfer(toTransfer).detach();
  return total.toString();
}

@view
export function get_donation_for_account(account_id: AccountId): Donation {
  const id = account_id.toString();
  const index = donationIndex(id);
  if (index >= 0) return state.donations[index];
  return new Donation(account_id, NearToken.zero());
}

@view
export function number_of_donors(): string {
  return state.donations.length.toString();
}

@view
export function get_donations(from_index: u32 = 0, limit: u32 = 10): Donation[] {
  const length = <u32>state.donations.length;
  const start = from_index < length ? from_index : length;
  const remaining = length - start;
  const count = limit < remaining ? limit : remaining;
  const result: Donation[] = [];
  for (let index = start; index < start + count; index++) {
    result.push(state.donations[index]);
  }
  return result;
}
