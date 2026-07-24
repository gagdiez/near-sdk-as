import { JSON } from "json-as";
import { fromBytes, readRegister, toBytes } from "./bytes";
import { host } from "./host";
import { Promise } from "../promise";
import { near } from "../near";

const INPUT_REGISTER: u64 = 2;

export function __readInput<A>(): A {
  host.input(INPUT_REGISTER);
  const bytes = readRegister(INPUT_REGISTER);
  assert(bytes !== null, "This method requires JSON arguments");
  return JSON.parse<A>(fromBytes(bytes!));
}

export function __returnJson<R>(result: R): void {
  const bytes = toBytes(JSON.stringify<R>(result));
  host.valueReturn(<u64>bytes.length, <u64>bytes.dataStart);
}

export function __returnPromise(result: Promise): void {
  host.promiseReturn(result.__schedule());
}

export function __requireNoDeposit(): void {
  const amount = new Uint8Array(16);
  host.attachedDeposit(<u64>amount.dataStart);
  for (let i = 0; i < amount.length; i++) {
    assert(amount[i] == 0, "This method does not accept an attached deposit");
  }
}

export function __requirePrivate(): void {
  assert(
    near.predecessorAccountId() == near.currentAccountId(),
    "This method is private",
  );
}
