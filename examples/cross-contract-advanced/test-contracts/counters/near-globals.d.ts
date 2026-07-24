type NearEndpoint = (...args: never[]) => unknown;

declare function contract_state(target: Function): void;
declare function view<T extends NearEndpoint>(target: T): void;
declare function call<T extends NearEndpoint>(target: T): void;
declare const state: import("./contract").State;
