# Basic Auction

A port of the [Basic Auction tutorial](https://github.com/near-examples/auctions-tutorial/tree/main/contract-ts/01-basic-auction).

The auction starts with the contract account holding a one-yocto bid. Higher
bids refund the previous bidder. Once the auction end timestamp is reached,
anyone can call `claim` once to transfer the winning bid to the auctioneer.

`end_time` is a decimal nanosecond timestamp, passed as a string to avoid the
JavaScript safe-integer limit.

```sh
npm install
npm test
```
