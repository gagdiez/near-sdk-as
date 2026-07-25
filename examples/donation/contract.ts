import { near, NearToken, Promise } from "near-sdk-as";

@json
export class Donation {
  account_id: string = "";
  total_amount: string = "0";

  constructor(account_id: string = "", total_amount: string = "0") {
    this.account_id = account_id;
    this.total_amount = total_amount;
  }
}

@json
export class DonationRecord {
  account_id: string = "";
  total_amount: NearToken = NearToken.zero();

  constructor(account_id: string = "", amount: NearToken = NearToken.zero()) {
    this.account_id = account_id;
    this.total_amount = amount;
  }
}

@contract_state
export class State {
  beneficiary: string = "";
  donations: DonationRecord[] = [];
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
    if (state.donations[i].account_id == accountId) return i;
  }
  return -1;
}

function donationView(record: DonationRecord): Donation {
  return new Donation(record.account_id, record.total_amount.toString());
}

@init
export function init(beneficiary: string): void {
  state.beneficiary = beneficiary;
}

@view
export function get_beneficiary(): string {
  requireInitialized();
  return state.beneficiary;
}

@call
export function change_beneficiary(new_beneficiary: string): void {
  requireInitialized();
  requirePrivate();
  state.beneficiary = new_beneficiary;
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

  if (index < 0) state.donations.push(new DonationRecord(donor, total));
  else state.donations[index].total_amount = total;

  near.log(
    "Thank you " + donor + " for donating " + donationAmount.toString() +
    "! You donated a total of " + total.toString(),
  );
  new Promise(state.beneficiary).transfer(toTransfer).detach();
  return total.toString();
}

@view
export function get_donation_for_account(account_id: string): Donation {
  requireInitialized();
  const index = donationIndex(account_id);
  return index < 0
    ? new Donation(account_id, "0")
    : donationView(state.donations[index]);
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
    result.push(donationView(state.donations[index]));
  }
  return result;
}
