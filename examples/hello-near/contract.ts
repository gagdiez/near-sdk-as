import { near } from "near-sdk-as";

@contract_state
export class State {
  greeting: string = "Hello";
}

@view
export function get_greeting(): string {
  return state.greeting;
}

@call
export function set_greeting(greeting: string): void {
  near.log("Saving greeting: " + greeting);
  state.greeting = greeting;
}
