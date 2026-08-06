import { Gas, near, Promise } from "near-sdk-as";
import { AccountId } from "near-sdk-as/account-id";

const XCC_GAS = Gas.fromTera(10);

@json
class NoArgs {}

@json
class SetGreetingArgs {
  greeting: string;

  constructor(greeting: string) {
    this.greeting = greeting;
  }
}

@json
class GetMessagesArgs {
  from_index: u32;
  limit: u32;

  constructor(from_index: u32, limit: u32) {
    this.from_index = from_index;
    this.limit = limit;
  }
}

@json
export class PostedMessage {
  premium: bool;
  sender: AccountId;
  text: string;

  constructor(premium: bool, sender: AccountId, text: string) {
    this.premium = premium;
    this.sender = sender;
    this.text = text;
  }
}

@json
export class MultipleContractsResult {
  greeting: string;
  counter: i8;
  messages: PostedMessage[];

  constructor(greeting: string, counter: i8, messages: PostedMessage[]) {
    this.greeting = greeting;
    this.counter = counter;
    this.messages = messages;
  }
}

@contract_state({ panicOnDefault: true })
export class State {
  hello_account!: AccountId;
  counter_account!: AccountId;
  guestbook_account!: AccountId;
}

@init
export function init(
  hello_account: AccountId,
  counter_account: AccountId,
  guestbook_account: AccountId
): void {
  state.hello_account = hello_account;
  state.counter_account = counter_account;
  state.guestbook_account = guestbook_account;
}

function callback(methodName: string): Promise {
  return new Promise(near.currentAccountId())
    .callFunction<NoArgs>(methodName, new NoArgs(), XCC_GAS);
}

@call
export function multiple_contracts(): Promise {
  const hello = new Promise(state.hello_account.toString())
    .callFunction<NoArgs>("get_greeting", new NoArgs(), XCC_GAS);
  const counter = new Promise(state.counter_account.toString())
    .callFunction<NoArgs>("get_num", new NoArgs(), XCC_GAS);
  const guestbook = new Promise(state.guestbook_account.toString())
    .callFunction<GetMessagesArgs>("get_messages", new GetMessagesArgs(0, 2), XCC_GAS);

  return hello.and(counter).and(guestbook)
    .then(callback("multiple_contracts_callback"));
}

@call({ privateMethod: true })
export function multiple_contracts_callback(): MultipleContractsResult {
  let greeting = "";
  let counter: i8 = 0;
  let messages = new Array<PostedMessage>();

  const helloResult = near.promiseResult(0);
  if (helloResult.succeeded()) greeting = helloResult.value<string>();
  else near.log("The call to Hello NEAR failed");

  const counterResult = near.promiseResult(1);
  if (counterResult.succeeded()) counter = counterResult.value<i8>();
  else near.log("The call to Counter failed");

  const guestbookResult = near.promiseResult(2);
  if (guestbookResult.succeeded()) messages = guestbookResult.value<PostedMessage[]>();
  else near.log("The call to Guest Book failed");

  return new MultipleContractsResult(greeting, counter, messages);
}

function setAndGetGreeting(greeting: string): Promise {
  return new Promise(state.hello_account.toString())
    .callFunction<SetGreetingArgs>(
      "set_greeting",
      new SetGreetingArgs(greeting),
      XCC_GAS,
    )
    .callFunction<NoArgs>("get_greeting", new NoArgs(), XCC_GAS);
}

@call
export function similar_contracts(): Promise {
  return setAndGetGreeting("hi")
    .and(setAndGetGreeting("howdy"))
    .and(setAndGetGreeting("bye"))
    .then(callback("similar_contracts_callback"));
}

@call({ privateMethod: true })
export function similar_contracts_callback(): string[] {
  const messages = new Array<string>();
  for (let i: u64 = 0; i < 3; i++) {
    const result = near.promiseResult(i);
    if (result.succeeded()) messages.push(result.value<string>());
    else near.log("A greeting promise failed");
  }
  return messages;
}

@call
export function batch_actions(): Promise {
  return new Promise(state.hello_account.toString())
    .callFunction<SetGreetingArgs>("set_greeting", new SetGreetingArgs("hi"), XCC_GAS)
    .callFunction<NoArgs>("get_greeting", new NoArgs(), XCC_GAS)
    .callFunction<SetGreetingArgs>("set_greeting", new SetGreetingArgs("bye"), XCC_GAS)
    .callFunction<NoArgs>("get_greeting", new NoArgs(), XCC_GAS)
    .then(callback("batch_actions_callback"));
}

@call({ privateMethod: true })
export function batch_actions_callback(): string {
  const result = near.promiseResult();
  if (!result.succeeded()) {
    near.log("The batch call failed and all calls were reverted");
    return "";
  }
  return result.value<string>();
}
