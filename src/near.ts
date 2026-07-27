import { fromBytes, readRegister, toBytes } from "./internal/bytes";
import { host } from "./internal/host";
import { Gas } from "./gas";
import { NearToken } from "./near-token";
import { Timestamp } from "./timestamp";
import { UInt64 } from "./uint64";
import { __promiseResult, PromiseResult } from "./promise";
import { PublicKey } from "./public-key";

const CONTEXT_REGISTER: u64 = 1;
const HASH_REGISTER: u64 = 2;
const ONE_YOCTO = NearToken.fromYoctoNear("1");

function readAccount(load: (registerId: u64) => void): string {
  load(CONTEXT_REGISTER);
  return fromBytes(readRegister(CONTEXT_REGISTER)!);
}

/** Requires exactly one yoctoNEAR, the standard authorization deposit. */
export function assertOneYocto(): void {
  assert(
    near.attachedDeposit().toString() == ONE_YOCTO.toString(),
    "Requires attached deposit of exactly 1 yoctoNEAR",
  );
}

export namespace near {
  export function currentAccountId(): string {
    return readAccount(host.currentAccountId);
  }

  export function signerAccountId(): string {
    return readAccount(host.signerAccountId);
  }

  export function signerAccountPublicKey(): PublicKey {
    host.signerAccountPublicKey(CONTEXT_REGISTER);
    return PublicKey.fromBytes(readRegister(CONTEXT_REGISTER)!);
  }

  export function predecessorAccountId(): string {
    return readAccount(host.predecessorAccountId);
  }

  export function blockHeight(): u64 {
    return host.blockHeight();
  }

  export function blockTimestamp(): Timestamp {
    return UInt64.fromU64(host.blockTimestamp());
  }

  export function epochHeight(): u64 {
    return host.epochHeight();
  }

  export function storageUsage(): u64 {
    return host.storageUsage();
  }

  export function randomSeed(): Uint8Array {
    host.randomSeed(CONTEXT_REGISTER);
    return readRegister(CONTEXT_REGISTER)!;
  }

  export function attachedDeposit(): NearToken {
    const bytes = new Uint8Array(16);
    host.attachedDeposit(<u64>bytes.dataStart);
    return NearToken.__fromBytes(bytes);
  }

  export function accountBalance(): NearToken {
    const bytes = new Uint8Array(16);
    host.accountBalance(<u64>bytes.dataStart);
    return NearToken.__fromBytes(bytes);
  }

  export function accountLockedBalance(): NearToken {
    const bytes = new Uint8Array(16);
    host.accountLockedBalance(<u64>bytes.dataStart);
    return NearToken.__fromBytes(bytes);
  }

  export function prepaidGas(): Gas {
    return Gas.fromGas(host.prepaidGas());
  }

  export function usedGas(): Gas {
    return Gas.fromGas(host.usedGas());
  }

  /** Returns the SHA-256 digest of `value`. */
  export function sha256(value: Uint8Array): Uint8Array {
    host.sha256(<u64>value.length, <u64>value.dataStart, HASH_REGISTER);
    return readRegister(HASH_REGISTER)!;
  }

  /** Returns the Keccak-256 digest of `value`. */
  export function keccak256(value: Uint8Array): Uint8Array {
    host.keccak256(<u64>value.length, <u64>value.dataStart, HASH_REGISTER);
    return readRegister(HASH_REGISTER)!;
  }

  /** Returns the Keccak-512 digest of `value`. */
  export function keccak512(value: Uint8Array): Uint8Array {
    host.keccak512(<u64>value.length, <u64>value.dataStart, HASH_REGISTER);
    return readRegister(HASH_REGISTER)!;
  }

  /** Number of results available to the current promise callback. */
  export function promiseResultsCount(): u64 {
    return host.promiseResultsCount();
  }

  export function promiseResult(index: u64 = 0): PromiseResult {
    return __promiseResult(index);
  }

  export function log(message: string): void {
    const bytes = toBytes(message);
    host.logUtf8(<u64>bytes.length, <u64>bytes.dataStart);
  }

  export function panic(message: string): void {
    const bytes = toBytes(message);
    host.panicUtf8(<u64>bytes.length, <u64>bytes.dataStart);
    unreachable();
  }

}
