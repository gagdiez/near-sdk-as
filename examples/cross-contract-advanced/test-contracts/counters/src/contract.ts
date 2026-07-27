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
export function decrement(number: i8 = 1): void {
  const next = <i16>state.val - <i16>number;
  assert(next >= -128, "Counter underflow");
  state.val = <i8>next;
  near.log("Decreased number to " + state.val.toString());
}
