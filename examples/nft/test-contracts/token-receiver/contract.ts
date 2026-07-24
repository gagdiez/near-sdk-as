@contract_state
export class State {}

@call
export function nft_on_transfer(sender_id: string, previous_owner_id: string, token_id: string, msg: string): bool {
  return msg == "return-it";
}
