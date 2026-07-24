import * as storage from "./internal";

/** A scalable set with explicit, paginated iteration. */
export class IterableSet<T> {
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

  has(value: T): bool {
    return storage.has(this.__namespace, "index", storage.identifier<T>(value));
  }

  add(value: T): bool {
    const id = storage.identifier<T>(value);
    if (storage.has(this.__namespace, "index", id)) return false;
    const length = this.length;
    assert(length < u32.MAX_VALUE, "IterableSet length exceeds u32");
    storage.write<T>(this.__namespace, "value", length.toString(), value);
    storage.write<u32>(this.__namespace, "index", id, length + 1);
    storage.setLength(this.__namespace, "meta", length + 1);
    return true;
  }

  delete(value: T): bool {
    const id = storage.identifier<T>(value);
    if (!storage.has(this.__namespace, "index", id)) return false;
    const storedIndex = storage.read<u32>(this.__namespace, "index", id, 0);

    const index = storedIndex - 1;
    const length = this.length;
    const lastIndex = length - 1;
    if (index != lastIndex) {
      const lastValue = storage.read<T>(this.__namespace, "value", lastIndex.toString(), changetype<T>(0));
      storage.write<T>(this.__namespace, "value", index.toString(), lastValue);
      storage.write<u32>(
        this.__namespace,
        "index",
        storage.identifier<T>(lastValue),
        index + 1,
      );
    }

    storage.remove(this.__namespace, "index", id);
    storage.remove(this.__namespace, "value", lastIndex.toString());
    storage.setLength(this.__namespace, "meta", lastIndex);
    return true;
  }

  /** Returns one explicit page. Iteration order is not stable after deletion. */
  values(from: u32 = 0, limit: u32 = 50): Array<T> {
    const result = new Array<T>();
    const end = this.length < from + limit ? this.length : from + limit;
    for (let index = from; index < end; index++) {
      result.push(storage.read<T>(this.__namespace, "value", index.toString(), changetype<T>(0)));
    }
    return result;
  }
}
