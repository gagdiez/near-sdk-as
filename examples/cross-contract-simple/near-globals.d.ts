type NearEndpoint = (...args: never[]) => unknown;

declare function contract_state(target: Function): void;
interface CallOptions {
  /** Allows the endpoint to receive an attached NEAR deposit. */
  payable?: boolean;
  /** Restricts the endpoint to calls made by this contract itself. */
  privateMethod?: boolean;
}

/** Exposes a read-only NEAR endpoint. Changes to `state` are not persisted. */
declare function view<T extends NearEndpoint>(target: T): void;

/** Initializes contract state. Fails when state already exists. */
declare function init<T extends NearEndpoint>(target: T): void;

/** Exposes a state-changing NEAR endpoint and persists `state` on success. */
declare function call<T extends NearEndpoint>(target: T): void;
declare function call(options: CallOptions): <T extends NearEndpoint>(target: T) => void;

declare const state: import("./contract").State;
