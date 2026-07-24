import * as storage from "./internal";

/** One key/value pair returned by IterableMap pagination. */
export class StoreEntry<K, V> {
  constructor(readonly key: K, readonly value: V) {}
}

/** A scalable map that also retains keys for explicit, paginated iteration. */
export class IterableMap<K, V> {
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

  has(key: K): bool {
    return storage.has(this.__namespace, "value", storage.identifier<K>(key));
  }

  get(key: K, fallback: V): V {
    return storage.read<V>(this.__namespace, "value", storage.identifier<K>(key), fallback);
  }

  getSome(key: K): V {
    const id = storage.identifier<K>(key);
    assert(storage.has(this.__namespace, "value", id), "Store key is not present");
    return storage.read<V>(this.__namespace, "value", id, changetype<V>(0));
  }

  set(key: K, value: V): void {
    const id = storage.identifier<K>(key);
    if (!storage.has(this.__namespace, "index", id)) {
      const length = this.length;
      assert(length < u32.MAX_VALUE, "IterableMap length exceeds u32");
      storage.write<K>(this.__namespace, "key", length.toString(), key);
      storage.write<u32>(this.__namespace, "index", id, length + 1);
      storage.setLength(this.__namespace, "meta", length + 1);
    }
    storage.write<V>(this.__namespace, "value", id, value);
  }

  delete(key: K): bool {
    const id = storage.identifier<K>(key);
    if (!storage.has(this.__namespace, "index", id)) return false;
    const storedIndex = storage.read<u32>(this.__namespace, "index", id, 0);

    const index = storedIndex - 1;
    const length = this.length;
    const lastIndex = length - 1;
    if (index != lastIndex) {
      const lastKey = storage.read<K>(this.__namespace, "key", lastIndex.toString(), changetype<K>(0));
      storage.write<K>(this.__namespace, "key", index.toString(), lastKey);
      storage.write<u32>(
        this.__namespace,
        "index",
        storage.identifier<K>(lastKey),
        index + 1,
      );
    }

    storage.remove(this.__namespace, "value", id);
    storage.remove(this.__namespace, "index", id);
    storage.remove(this.__namespace, "key", lastIndex.toString());
    storage.setLength(this.__namespace, "meta", lastIndex);
    return true;
  }

  /** Returns keys from one explicit page. Iteration order is not stable after deletion. */
  keys(from: u32 = 0, limit: u32 = 50): Array<K> {
    const result = new Array<K>();
    const end = this.length < from + limit ? this.length : from + limit;
    for (let index = from; index < end; index++) {
      result.push(storage.read<K>(this.__namespace, "key", index.toString(), changetype<K>(0)));
    }
    return result;
  }

  /** Returns entries from one explicit page. */
  entries(from: u32 = 0, limit: u32 = 50): Array<StoreEntry<K, V>> {
    const result = new Array<StoreEntry<K, V>>();
    const keys = this.keys(from, limit);
    for (let index = 0; index < keys.length; index++) {
      const key = keys[index];
      result.push(new StoreEntry<K, V>(key, this.getSome(key)));
    }
    return result;
  }

  /** Returns values from one explicit page. */
  values(from: u32 = 0, limit: u32 = 50): Array<V> {
    const result = new Array<V>();
    const keys = this.keys(from, limit);
    for (let index = 0; index < keys.length; index++) result.push(this.getSome(keys[index]));
    return result;
  }
}
