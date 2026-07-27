/**
 * Editor declarations for AssemblyScript NEAR contracts.
 *
 * Reference this from an example's tsconfig with
 * `"types": ["assembly", "near-sdk-as/globals"]`. The near-as compiler replaces the
 * editor-only `state` declaration with a typed generated binding.
 */
type NearEndpoint = (...args: never[]) => unknown;

declare function contract_state(target: Function): void;

interface CallOptions {
  payable?: boolean;
  privateMethod?: boolean;
}

declare function view<T extends NearEndpoint>(target: T): void;
declare function init<T extends NearEndpoint>(target: T): void;
declare function call<T extends NearEndpoint>(target: T): void;
declare function call(options: CallOptions): <T extends NearEndpoint>(target: T) => void;

/** @internal Editor fallback; near-as generates the concrete State binding. */
declare const state: any;
