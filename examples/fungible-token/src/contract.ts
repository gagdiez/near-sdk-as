import { AccountId, assertOneYocto, Gas, LookupMap, NearToken, Promise, UInt128, near } from "near-sdk-as";
import { balanceOf, deposit, isDecimal, min, register, transfer } from "./internal";
import { FungibleTokenMetadata, ResolveTransferArgs, StorageBalance, StorageBalanceBounds, TransferCallArgs } from "./model";

export { FungibleTokenMetadata } from "./model";

const STORAGE_BALANCE = NearToken.fromYoctoNear("1250000000000000000000");
const RECEIVER_GAS = Gas.fromTera(25);
const RESOLVE_GAS = Gas.fromTera(5);

@contract_state({ panicOnDefault: true })
export class State {
  accounts!: LookupMap<string, UInt128>;
  total_supply!: UInt128;
  metadata!: FungibleTokenMetadata;
}

function storageBalance(): StorageBalance {
  return new StorageBalance(STORAGE_BALANCE, NearToken.zero());
}

function initialize(ownerId: string, totalSupply: UInt128, metadata: FungibleTokenMetadata): void {
  assert(metadata.name.length > 0 && metadata.symbol.length > 0, "Metadata name and symbol are required");
  state.total_supply = totalSupply;
  state.metadata = metadata;
  register(ownerId);
  deposit(ownerId, totalSupply);
  near.log("EVENT_JSON:{\"standard\":\"nep141\",\"version\":\"1.0.0\",\"event\":\"ft_mint\",\"data\":[{\"owner_id\":\"" + ownerId + "\",\"amount\":\"" + totalSupply.toString() + "\",\"memo\":\"Initial token supply is minted\"}]}");
}

@init
export function init(owner_id: AccountId, total_supply: UInt128, metadata: FungibleTokenMetadata): void {
  initialize(owner_id.toString(), total_supply, metadata);
}

@init
export function init_default_meta(owner_id: AccountId, total_supply: UInt128): void {
  const metadata = new FungibleTokenMetadata();
  metadata.name = "Team Token FT Tutorial";
  metadata.symbol = "gtNEAR";
  initialize(owner_id.toString(), total_supply, metadata);
}

@view
export function ft_metadata(): FungibleTokenMetadata {
  return state.metadata;
}

@view
export function ft_total_supply(): string {
  return state.total_supply.toString();
}

@view
export function ft_balance_of(account_id: AccountId): string {
  return balanceOf(account_id.toString()).toString();
}

@call({ payable: true })
export function storage_deposit(account_id: AccountId | null = null, registration_only: bool = false): StorageBalance {
  const accountId = account_id == null ? near.predecessorAccountId() : account_id.toString();
  const attached = near.attachedDeposit();
  if (state.accounts.has(accountId)) {
    if (!attached.isZero()) new Promise(near.predecessorAccountId()).transfer(attached).detach();
    return storageBalance();
  }

  assert(attached.greaterThanOrEqual(STORAGE_BALANCE), "The attached deposit is less than the minimum storage balance");
  register(accountId);
  const refund = attached.saturatingSub(STORAGE_BALANCE);
  if (!refund.isZero()) new Promise(near.predecessorAccountId()).transfer(refund).detach();
  return storageBalance();
}

@view
export function storage_balance_bounds(): StorageBalanceBounds {
  return new StorageBalanceBounds(STORAGE_BALANCE, STORAGE_BALANCE);
}

@view
export function storage_balance_of(account_id: AccountId): StorageBalance | null {
  return state.accounts.has(account_id.toString()) ? storageBalance() : null;
}

@call({ payable: true })
export function ft_transfer(receiver_id: AccountId, amount: UInt128, memo: string = ""): void {
  assertOneYocto();
  transfer(near.predecessorAccountId(), receiver_id.toString(), amount, memo);
}

@call({ payable: true })
export function ft_transfer_call(receiver_id: AccountId, amount: UInt128, memo: string = "", msg: string = ""): Promise {
  assertOneYocto();
  const senderId = near.predecessorAccountId();
  const receiverId = receiver_id.toString();
  transfer(senderId, receiverId, amount, memo);

  const receiverArgs = new TransferCallArgs(senderId, amount.toString(), msg);
  const resolveArgs = new ResolveTransferArgs(senderId, receiverId, amount.toString());
  return new Promise(receiverId)
    .callFunction<TransferCallArgs>("ft_on_transfer", receiverArgs, RECEIVER_GAS)
    .then(new Promise(near.currentAccountId()).callFunction<ResolveTransferArgs>("ft_resolve_transfer", resolveArgs, RESOLVE_GAS));
}

@call({ privateMethod: true })
export function ft_resolve_transfer(sender_id: string, receiver_id: string, amount: string): string {
  const transferred = UInt128.fromString(amount);
  let unused = transferred;
  if (near.promiseResult().succeeded()) {
    const requested = near.promiseResult().value<string>();
    if (isDecimal(requested)) unused = min(transferred, UInt128.fromString(requested));
  }

  if (!unused.isZero() && state.accounts.has(receiver_id)) {
    const refund = min(balanceOf(receiver_id), unused);
    if (!refund.isZero()) {
      transfer(receiver_id, sender_id, refund, "Refund");
      const used = transferred.checkedSub(refund);
      assert(used != null, "Transfer refund exceeds the transferred amount");
      return used!.toString();
    }
  }
  return transferred.toString();
}
