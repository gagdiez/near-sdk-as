import { readRegister } from "./bytes";
import { host } from "./host";

const STORAGE_REGISTER: u64 = 0;

export namespace rawStorage {
  export function has(key: Uint8Array): bool {
    return host.storageHasKey(<u64>key.length, <u64>key.dataStart) == 1;
  }

  export function write(key: Uint8Array, value: Uint8Array): void {
    host.storageWrite(
      <u64>key.length,
      <u64>key.dataStart,
      <u64>value.length,
      <u64>value.dataStart,
      STORAGE_REGISTER,
    );
  }

  export function read(key: Uint8Array): Uint8Array | null {
    if (host.storageRead(<u64>key.length, <u64>key.dataStart, STORAGE_REGISTER) == 0) {
      return null;
    }
    return readRegister(STORAGE_REGISTER);
  }

  export function remove(key: Uint8Array): bool {
    return host.storageRemove(<u64>key.length, <u64>key.dataStart, STORAGE_REGISTER) == 1;
  }
}
