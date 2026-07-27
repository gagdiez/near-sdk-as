import { AccountId } from "near-sdk-as";

@contract_state
export class State {}

@call
export function nft_on_transfer(sender_id: AccountId, previous_owner_id: AccountId, token_id: string, msg: string): bool {
  return msg == "return-it";
}
