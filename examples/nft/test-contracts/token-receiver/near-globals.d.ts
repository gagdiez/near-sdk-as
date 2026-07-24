/// <reference path="../../node_modules/assemblyscript/std/assembly/index.d.ts" />

type NearEndpoint = (...args: never[]) => unknown;
declare function contract_state(target: Function): void;
declare function call<T extends NearEndpoint>(target: T): void;
declare const state: import("./contract").State;
