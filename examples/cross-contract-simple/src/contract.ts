import { AccountId, Gas, near, Promise } from "near-sdk-as";

const FIVE_TGAS = Gas.fromTera(5);

@json
class NoArgs {}

@json
class SetGreetingArgs {
  greeting: string;

  constructor(greeting: string) {
    this.greeting = greeting;
  }
}

@contract_state({ panicOnDefault: true })
export class State {
  hello_account!: AccountId;
}

@init
export function init(hello_account: AccountId): void {
  state.hello_account = hello_account;
}

@call
export function query_greeting(): Promise {
  return new Promise(state.hello_account.toString())
    .callFunction<NoArgs>("get_greeting", new NoArgs(), FIVE_TGAS)
    .then(
      new Promise(near.currentAccountId())
        .callFunction<NoArgs>("query_greeting_callback", new NoArgs(), FIVE_TGAS),
    );
}

@call({ privateMethod: true })
export function query_greeting_callback(): string {
  assert(near.promiseResultsCount() == 1, "Expected one promise result");
  const result = near.promiseResult();
  if (result.failed()) {
    near.log("There was an error contacting Hello NEAR");
    return "";
  }
  assert(!result.pending(), "Promise result is not ready");
  return result.value<string>();
}

@call
export function change_greeting(new_greeting: string): Promise {
  return new Promise(state.hello_account.toString())
    .callFunction<SetGreetingArgs>(
      "set_greeting",
      new SetGreetingArgs(new_greeting),
      FIVE_TGAS,
    )
    .then(
      new Promise(near.currentAccountId())
        .callFunction<NoArgs>("change_greeting_callback", new NoArgs(), FIVE_TGAS),
    );
}

@call({ privateMethod: true })
export function change_greeting_callback(): bool {
  assert(near.promiseResultsCount() == 1, "Expected one promise result");
  const result = near.promiseResult();
  assert(!result.pending(), "Promise result is not ready");
  const succeeded = result.succeeded();
  near.log(succeeded ? "set_greeting was successful!" : "set_greeting failed...");
  return succeeded;
}
