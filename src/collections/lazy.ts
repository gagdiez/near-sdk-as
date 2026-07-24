import * as storage from "./internal";

/** A single value stored separately from the root contract and loaded on demand. */
export class Deferred<T> {
  __namespace: string = "";

  /** @internal Bound by the @contract_state compiler using this field's stable name. */
  __bind(namespace: string): void {
    this.__namespace = storage.bindNamespace(this.__namespace, namespace);
  }

  isSet(): bool {
    return storage.has(this.__namespace, "value", "value");
  }

  get(): T {
    assert(this.isSet(), "Deferred value is not set");
    return storage.read<T>(this.__namespace, "value", "value", changetype<T>(0));
  }

  set(value: T): void {
    storage.write<T>(this.__namespace, "value", "value", value);
  }

  remove(): T {
    const value = this.get();
    storage.remove(this.__namespace, "value", "value");
    return value;
  }
}
