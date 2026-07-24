import { Gas, near, Promise } from "near-sdk-as";

const XCC_GAS = Gas.fromTera(10);

@json
class NoArgs {}

@json
class SetGreetingArgs {
  greeting: string = "";

  constructor(greeting: string = "") {
    this.greeting = greeting;
  }
}

@json
class GetMessagesArgs {
  from_index: u32 = 0;
  limit: u32 = 2;
}

@json
export class PostedMessage {
  premium: bool = false;
  sender: string = "";
  text: string = "";
}

@json
export class MultipleContractsResult {
  greeting: string = "";
  counter: i8 = 0;
  messages: PostedMessage[] = [];
}

@contract_state
export class State {
  hello_account: string = "";
  counter_account: string = "";
  guestbook_account: string = "";
}

@init
export function init(
  hello_account: string,
  counter_account: string,
  guestbook_account: string
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
  const hello = new Promise(state.hello_account)
    .callFunction<NoArgs>("get_greeting", new NoArgs(), XCC_GAS);
  const counter = new Promise(state.counter_account)
    .callFunction<NoArgs>("get_num", new NoArgs(), XCC_GAS);
  const guestbook = new Promise(state.guestbook_account)
    .callFunction<GetMessagesArgs>("get_messages", new GetMessagesArgs(), XCC_GAS);

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

  const result = new MultipleContractsResult();
  result.greeting = greeting;
  result.counter = counter;
  result.messages = messages;
  return result;
}

function setAndGetGreeting(greeting: string): Promise {
  return new Promise(state.hello_account)
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
  return new Promise(state.hello_account)
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
