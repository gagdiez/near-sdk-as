import * as storage from "./internal";

/** An optional value stored separately from the root contract and loaded on demand. */
export class LazyOption<T> {
  __namespace: string = "";

  /** @internal Bound by the @contract_state compiler using this field's stable name. */
  __bind(namespace: string): void {
    this.__namespace = storage.bindNamespace(this.__namespace, namespace);
  }

  isSome(): bool {
    return storage.has(this.__namespace, "value", "value");
  }

  get(fallback: T): T {
    return storage.read<T>(this.__namespace, "value", "value", fallback);
  }

  getSome(): T {
    assert(this.isSome(), "LazyOption value is not set");
    return storage.read<T>(this.__namespace, "value", "value", changetype<T>(0));
  }

  set(value: T): void {
    storage.write<T>(this.__namespace, "value", "value", value);
  }

  clear(): bool {
    return storage.remove(this.__namespace, "value", "value");
  }
}
