import { codec } from "./codec";
import { toBytes } from "./bytes";
import { rawStorage } from "./raw-storage";

// Deliberately fixed. The first examples have one root state object and one key.
const CONTRACT_STATE_KEY = toBytes("STATE");

export function __loadContract<T>(): T | null {
  const value = rawStorage.read(CONTRACT_STATE_KEY);
  return value === null ? null : codec.decode<T>(value);
}

export function __saveContract<T>(contract: T): void {
  rawStorage.write(CONTRACT_STATE_KEY, codec.encode<T>(contract));
}

export function __requireUninitialized(): void {
  assert(!rawStorage.has(CONTRACT_STATE_KEY), "Contract is already initialized");
}

export function __requireInitialized(): void {
  assert(rawStorage.has(CONTRACT_STATE_KEY), "Contract is not initialized");
}
