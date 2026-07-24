import * as storage from "./internal";

/** A scalable, index-addressed sequence persisted one element per storage key. */
export class Vector<T> {
  __namespace: string = "";

  /** @internal Bound by the @contract_state compiler using this field's stable name. */
  __bind(namespace: string): void {
    this.__namespace = storage.bindNamespace(this.__namespace, namespace);
  }

  get length(): u32 {
    return storage.length(this.__namespace, "meta");
  }

  isEmpty(): bool {
    return this.length == 0;
  }

  get(index: u32, fallback: T): T {
    if (index >= this.length) return fallback;
    return storage.read<T>(this.__namespace, "value", index.toString(), fallback);
  }

  getSome(index: u32): T {
    assert(index < this.length, "Vector index is out of bounds");
    return storage.read<T>(this.__namespace, "value", index.toString(), changetype<T>(0));
  }

  set(index: u32, value: T): void {
    assert(index < this.length, "Vector index is out of bounds");
    storage.write<T>(this.__namespace, "value", index.toString(), value);
  }

  push(value: T): u32 {
    const index = this.length;
    assert(index < u32.MAX_VALUE, "Vector length exceeds u32");
    storage.write<T>(this.__namespace, "value", index.toString(), value);
    storage.setLength(this.__namespace, "meta", index + 1);
    return index;
  }

  pop(): T {
    const length = this.length;
    assert(length > 0, "Vector is empty");
    const index = length - 1;
    const value = storage.read<T>(this.__namespace, "value", index.toString(), changetype<T>(0));
    storage.remove(this.__namespace, "value", index.toString());
    storage.setLength(this.__namespace, "meta", index);
    return value;
  }

  swapRemove(index: u32): T {
    const length = this.length;
    assert(index < length, "Vector index is out of bounds");
    const removed = this.getSome(index);
    const lastIndex = length - 1;
    if (index != lastIndex) this.set(index, this.getSome(lastIndex));
    this.pop();
    return removed;
  }

  clear(): void {
    while (!this.isEmpty()) this.pop();
  }

  /** Returns one page without loading the remainder of the vector. */
  values(from: u32 = 0, limit: u32 = 50): Array<T> {
    const result = new Array<T>();
    const end = this.length < from + limit ? this.length : from + limit;
    for (let index = from; index < end; index++) result.push(this.getSome(index));
    return result;
  }
}
