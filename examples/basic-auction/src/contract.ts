import { near, Promise } from "near-sdk-as";
import { AccountId } from "near-sdk-as/account-id";
import { NearToken } from "near-sdk-as/near-token";
import { Timestamp } from "near-sdk-as/timestamp";

@json
export class Bid {
  bidder: AccountId;
  bid: NearToken;

  constructor(
    bidder: AccountId,
    bid: NearToken,
  ) {
    this.bidder = bidder;
    this.bid = bid;
  }
}

@contract_state({ panicOnDefault: true })
export class State {
  highest_bid!: Bid;
  auction_end_time!: Timestamp;
  auctioneer!: AccountId;
  claimed: bool;
}

@init
export function init(end_time: Timestamp, auctioneer: AccountId): void {
  state.highest_bid = new Bid(
    AccountId.fromString(near.currentAccountId()),
    NearToken.fromYoctoNear("1"),
  );
  state.auction_end_time = end_time;
  state.auctioneer = auctioneer;
  state.claimed = false;
}

@call({ payable: true })
export function bid(): Promise {
  assert(
    state.auction_end_time.greaterThan(near.blockTimestamp()),
    "Auction has ended",
  );
  const amount = near.attachedDeposit();
  assert(amount.greaterThan(state.highest_bid.bid), "You must place a higher bid");

  const previousBidder = state.highest_bid.bidder;
  const previousBid = state.highest_bid.bid;
  state.highest_bid.bidder = AccountId.fromString(near.predecessorAccountId());
  state.highest_bid.bid = amount;
  return new Promise(previousBidder.toString()).transfer(previousBid);
}

@call
export function claim(): Promise {
  assert(
    state.auction_end_time.lessThanOrEqual(near.blockTimestamp()),
    "Auction has not ended yet",
  );
  assert(!state.claimed, "Auction has been claimed");
  state.claimed = true;
  return new Promise(state.auctioneer.toString()).transfer(state.highest_bid.bid);
}

@view
export function get_highest_bid(): Bid {
  return state.highest_bid;
}

@view
export function get_auction_end_time(): Timestamp { return state.auction_end_time; }

@view
export function get_auctioneer(): string { return state.auctioneer.toString(); }

@view
export function get_claimed(): bool { return state.claimed; }
