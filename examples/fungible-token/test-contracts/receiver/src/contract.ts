import { AccountId } from "near-sdk-as";

@contract_state
export class State {}

@call
export function ft_on_transfer(sender_id: AccountId, amount: string, msg: string): string {
  return msg == "keep" ? "0" : msg;
}
