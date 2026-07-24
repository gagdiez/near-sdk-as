import * as storage from "./internal";

/** A scalable key-value map. Keys are not retained for iteration. */
export class LookupMap<K, V> {
  __namespace: string = "";

  /** @internal Bound by the @contract_state compiler using this field's stable name. */
  __bind(namespace: string): void {
    this.__namespace = storage.bindNamespace(this.__namespace, namespace);
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
    storage.write<V>(this.__namespace, "value", storage.identifier<K>(key), value);
  }

  delete(key: K): bool {
    return storage.remove(this.__namespace, "value", storage.identifier<K>(key));
  }
}
