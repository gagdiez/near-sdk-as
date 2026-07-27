import { near, NearToken } from "near-sdk-as";

@json
export class PostedMessage {
  premium: bool = false;
  sender: string = "";
  text: string = "";

  constructor(premium: bool = false, sender: string = "", text: string = "") {
    this.premium = premium;
    this.sender = sender;
    this.text = text;
  }
}

@contract_state
export class State {
  messages: PostedMessage[] = [];
}

@call({ payable: true })
export function add_message(text: string): void {
  state.messages.push(new PostedMessage(
    near.attachedDeposit().greaterThanOrEqual(NearToken.fromMilliNear(100)),
    near.predecessorAccountId(),
    text,
  ));
}

@view
export function get_messages(from_index: u32 = 0, limit: u32 = 10): PostedMessage[] {
  const length = <u32>state.messages.length;
  const start = from_index < length ? from_index : length;
  const count = limit < length - start ? limit : length - start;
  return state.messages.slice(<i32>start, <i32>(start + count));
}
