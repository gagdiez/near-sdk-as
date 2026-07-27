import { AccountId, near, NearToken, Promise } from "near-sdk-as";

@json
export class Donation {
  account_id: AccountId | null = null;
  total_amount: NearToken = NearToken.zero();
}

@contract_state
export class State {
  beneficiary: string = "";
  donations: Donation[] = [];
}

function requireInitialized(): void {
  assert(state.beneficiary.length > 0, "State is not initialized");
}

function requirePrivate(): void {
  assert(
    near.predecessorAccountId() == near.currentAccountId(),
    "This method is private",
  );
}

function donationIndex(accountId: string): i32 {
  for (let i = 0; i < state.donations.length; i++) {
    const stored = state.donations[i].account_id;
    if (stored != null && stored.toString() == accountId) return i;
  }
  return -1;
}

@init
export function init(beneficiary: AccountId): void {
  state.beneficiary = beneficiary.toString();
}

@view
export function get_beneficiary(): string {
  requireInitialized();
  return state.beneficiary;
}

@call
export function change_beneficiary(new_beneficiary: AccountId): void {
  requireInitialized();
  requirePrivate();
  state.beneficiary = new_beneficiary.toString();
}

@call({ payable: true })
export function donate(): string {
  requireInitialized();
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
    const record = new Donation();
    record.account_id = AccountId.fromString(donor);
    record.total_amount = total;
    state.donations.push(record);
  }
  else state.donations[index].total_amount = total;

  near.log(
    "Thank you " + donor + " for donating " + donationAmount.toString() +
    "! You donated a total of " + total.toString(),
  );
  new Promise(state.beneficiary).transfer(toTransfer).detach();
  return total.toString();
}

@view
export function get_donation_for_account(account_id: AccountId): Donation {
  requireInitialized();
  const id = account_id.toString();
  const index = donationIndex(id);
  if (index >= 0) return state.donations[index];
  const result = new Donation();
  result.account_id = account_id;
  return result;
}

@view
export function number_of_donors(): string {
  requireInitialized();
  return state.donations.length.toString();
}

@view
export function get_donations(from_index: u32 = 0, limit: u32 = 10): Donation[] {
  requireInitialized();
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
