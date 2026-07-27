# Fungible Token Transfers

A multi-file port of the [FT tutorial transfer stage](https://github.com/near-examples/ft-tutorial/tree/main/5.transfers/src).

It implements NEP-141 metadata, balances, storage registration, transfers, and
`ft_transfer_call` refunds. FT quantities use `UInt128`; attached storage deposits
use `NearToken`; cross-contract receipt gas uses `Gas`.

The Rust tutorial calls its initializer `new`; `new` is reserved in
AssemblyScript, so this port exposes the same initializer as `init`.

```sh
npm install
npm test
```
