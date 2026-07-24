import * as storage from "./internal";

/** A scalable set with membership checks but no iteration. */
export class LookupSet<T> {
  __namespace: string = "";

  /** @internal Bound by the @contract_state compiler using this field's stable name. */
  __bind(namespace: string): void {
    this.__namespace = storage.bindNamespace(this.__namespace, namespace);
  }

  has(value: T): bool {
    return storage.has(this.__namespace, "value", storage.identifier<T>(value));
  }

  add(value: T): bool {
    const id = storage.identifier<T>(value);
    if (storage.has(this.__namespace, "value", id)) return false;
    storage.write<bool>(this.__namespace, "value", id, true);
    return true;
  }

  delete(value: T): bool {
    return storage.remove(this.__namespace, "value", storage.identifier<T>(value));
  }
}
