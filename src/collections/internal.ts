import { toBytes } from "../internal/bytes";
import { codec } from "../internal/codec";
import { rawStorage } from "../internal/raw-storage";
import { JSON } from "json-as";

const ROOT = "near-sdk-as:store:";

export function bindNamespace(current: string, namespace: string): string {
  assert(namespace.length > 0, "Store collection namespace cannot be empty");
  assert(current.length == 0 || current == namespace, "Store collection is already bound");
  return namespace;
}

function key(namespace: string, section: string, id: string): Uint8Array {
  assert(namespace.length > 0, "Collection must be a field of @contract_state");
  return toBytes(ROOT + namespace + ":" + section + ":" + id);
}

export function read<T>(namespace: string, section: string, id: string, fallback: T): T {
  const value = rawStorage.read(key(namespace, section, id));
  return value === null ? fallback : codec.decode<T>(value);
}

export function write<T>(namespace: string, section: string, id: string, value: T): void {
  rawStorage.write(key(namespace, section, id), codec.encode<T>(value));
}

export function has(namespace: string, section: string, id: string): bool {
  return rawStorage.has(key(namespace, section, id));
}

export function remove(namespace: string, section: string, id: string): bool {
  return rawStorage.remove(key(namespace, section, id));
}

export function identifier<T>(value: T): string {
  return JSON.stringify<T>(value);
}

export function length(namespace: string, section: string): u32 {
  return read<u32>(namespace, section, "length", 0);
}

export function setLength(namespace: string, section: string, value: u32): void {
  write<u32>(namespace, section, "length", value);
}
