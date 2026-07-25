/// <reference path="./node_modules/assemblyscript/std/assembly/index.d.ts" />

type NearEndpoint = (...args: never[]) => unknown;
declare function contract_state(target: Function): void;
interface CallOptions { payable?: boolean; privateMethod?: boolean; }
declare function view<T extends NearEndpoint>(target: T): void;
declare function init<T extends NearEndpoint>(target: T): void;
declare function call<T extends NearEndpoint>(target: T): void;
declare function call(options: CallOptions): <T extends NearEndpoint>(target: T) => void;
declare const state: import("./contract").State;
