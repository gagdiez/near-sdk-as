import { host } from "./host";

export const MISSING_REGISTER: u64 = u64.MAX_VALUE;

export function toBytes(value: string): Uint8Array {
  return Uint8Array.wrap(String.UTF8.encode(value));
}

export function fromBytes(value: Uint8Array): string {
  return String.UTF8.decode(value.buffer, false);
}

export function readRegister(registerId: u64): Uint8Array | null {
  const length = host.registerLength(registerId);
  if (length == MISSING_REGISTER) return null;

  assert(length <= <u64>i32.MAX_VALUE, "Register value is too large");
  const result = new Uint8Array(<i32>length);
  host.readRegister(registerId, <u64>result.dataStart);
  return result;
}

export function join(left: Uint8Array, separator: u8, right: Uint8Array): Uint8Array {
  const result = new Uint8Array(left.length + 1 + right.length);
  memory.copy(result.dataStart, left.dataStart, left.length);
  result[left.length] = separator;
  memory.copy(result.dataStart + left.length + 1, right.dataStart, right.length);
  return result;
}
