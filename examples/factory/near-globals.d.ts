type NearEndpoint = (...args: never[]) => unknown;

declare function contract_state(target: Function): void;
interface CallOptions { payable?: boolean; privateMethod?: boolean; }
declare function view<T extends NearEndpoint>(target: T): void;
/** Initializes contract state. Fails when state already exists. */
declare function init<T extends NearEndpoint>(target: T): void;
declare function call<T extends NearEndpoint>(target: T): void;
declare function call(options: CallOptions): <T extends NearEndpoint>(target: T) => void;
declare function alias(name: string): PropertyDecorator;
declare const state: import("./contract").State;
