type NearEndpoint = (...args: never[]) => unknown;

declare function contract_state(target: Function): void;
interface CallOptions {
  /** Allows the endpoint to receive an attached NEAR deposit. */
  payable?: boolean;
}

/**
 * Exposes a read-only NEAR endpoint.
 *
 * A view receives JSON arguments and may return a JSON value, but changes to
 * `state` are never persisted.
 */
declare function view<T extends NearEndpoint>(target: T): void;

/** Initializes contract state. Fails when state already exists. */
declare function init<T extends NearEndpoint>(target: T): void;

/**
 * Exposes a state-changing NEAR endpoint.
 *
 * A successful call persists `state` after the function returns. Attached
 * deposits require `{ payable: true }`.
 */
declare function call<T extends NearEndpoint>(target: T): void;
declare function call(options: CallOptions): <T extends NearEndpoint>(target: T) => void;

declare const state: import("./contract").State;
