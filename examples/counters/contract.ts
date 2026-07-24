import { near } from "near-sdk-as";

@contract_state
export class State {
  val: i8 = 0;
}

@view
export function get_num(): i8 {
  return state.val;
}

@call
export function increment(number: i8 = 1): void {
  const next = <i16>state.val + <i16>number;
  assert(next <= 127, "Counter overflow");
  state.val = <i8>next;
  near.log("Increased number to " + state.val.toString());
}

@call
export function decrement(number: i8 = 1): void {
  const next = <i16>state.val - <i16>number;
  assert(next >= -128, "Counter underflow");
  state.val = <i8>next;
  near.log("Decreased number to " + state.val.toString());
}

@call
export function reset(): void {
  state.val = 0;
  near.log("Reset counter to zero");
}
