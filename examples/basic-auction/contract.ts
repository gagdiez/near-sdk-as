import { near, NearToken, Promise } from "near-sdk-as";

@json
export class Bid {
  bidder: string = "";
  bid: string = "0";
}

@json
class StoredBid {
  bidder: string = "";
  bid: NearToken = NearToken.zero();
}

@contract_state
export class State {
  highest_bid: StoredBid = new StoredBid();
  auction_end_time: u64 = 0;
  auctioneer: string = "";
  claimed: bool = false;
}

@init
export function init(end_time: string, auctioneer: string): void {
  state.auction_end_time = u64.parse(end_time);
  state.highest_bid.bidder = near.currentAccountId();
  state.highest_bid.bid = NearToken.fromYoctoNear("1");
  state.auctioneer = auctioneer;
}

@call({ payable: true })
export function bid(): Promise {
  assert(
    state.auction_end_time > near.blockTimestamp(),
    "Auction has ended",
  );
  const amount = near.attachedDeposit();
  assert(amount.greaterThan(state.highest_bid.bid), "You must place a higher bid");

  const previousBidder = state.highest_bid.bidder;
  const previousBid = state.highest_bid.bid;
  state.highest_bid.bidder = near.predecessorAccountId();
  state.highest_bid.bid = amount;
  return new Promise(previousBidder).transfer(previousBid);
}

@call
export function claim(): Promise {
  assert(
    state.auction_end_time <= near.blockTimestamp(),
    "Auction has not ended yet",
  );
  assert(!state.claimed, "Auction has been claimed");
  state.claimed = true;
  return new Promise(state.auctioneer).transfer(state.highest_bid.bid);
}

@view
export function get_highest_bid(): Bid {
  const result = new Bid();
  result.bidder = state.highest_bid.bidder;
  result.bid = state.highest_bid.bid.toString();
  return result;
}

@view
export function get_auction_end_time(): string { return state.auction_end_time.toString(); }

@view
export function get_auctioneer(): string { return state.auctioneer; }

@view
export function get_claimed(): bool { return state.claimed; }
