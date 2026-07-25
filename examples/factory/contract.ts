import { embed, Gas, JSON, near, NearToken, Promise, U128 } from "near-sdk-as";

const EXTRA_STORAGE_BYTES: u64 = 10_000;
const STORAGE_BYTE_COST = NearToken.fromYoctoNear("10000000000000000000");
const TOKEN_GAS = Gas.fromTera(50);
const CALLBACK_GAS = Gas.fromTera(30);
const TOKEN_CODE = embed.bytes("./token/build/contract.wasm");

@json
export class TokenMetadata {
  spec: string = "";
  name: string = "";
  symbol: string = "";
  decimals: u8 = 0;
  icon: string | null = null;
  reference: string | null = null;
  reference_hash: string | null = null;
}

@json
export class TokenArgs {
  owner_id: string = "";
  @alias("total_supply")
  __total_supply: string = "0";
  metadata: TokenMetadata = new TokenMetadata();

  get total_supply(): U128 {
    return U128.fromString(this.__total_supply);
  }

  set total_supply(value: U128) {
    this.__total_supply = value.toString();
  }
}

@json
class InitializeArgs {
  owner_id: string = "";
  total_supply: string = "0";
  metadata: TokenMetadata = new TokenMetadata();

  constructor(args: TokenArgs = new TokenArgs()) {
    this.owner_id = args.owner_id;
    this.total_supply = args.total_supply.toString();
    this.metadata = args.metadata;
  }
}

@json
class CallbackArgs {
  user: string = "";
  deposit: NearToken = NearToken.zero();

  constructor(user: string = "", deposit: NearToken = NearToken.zero()) {
    this.user = user;
    this.deposit = deposit;
  }
}

@contract_state
export class State {}

function validTokenId(tokenId: string): bool {
  if (tokenId.length == 0) return false;
  for (let i = 0; i < tokenId.length; i++) {
    const code = tokenId.charCodeAt(i);
    if (!((code >= 48 && code <= 57) || (code >= 97 && code <= 122))) return false;
  }
  return true;
}

@view
export function get_required(args: TokenArgs): NearToken {
  return requiredDeposit(args);
}

function requiredDeposit(args: TokenArgs): NearToken {
  const argumentBytes = String.UTF8.byteLength(JSON.stringify<TokenArgs>(args));
  const bytes = <u64>TOKEN_CODE.length + EXTRA_STORAGE_BYTES + <u64>argumentBytes;
  return STORAGE_BYTE_COST.saturatingMul(bytes);
}

@call({ payable: true })
export function create_token(args: TokenArgs): Promise {
  assert(args.metadata.spec == "ft-1.0.0", "Invalid metadata spec");
  assert(args.metadata.name.length > 0, "Token name is required");
  const tokenId = args.metadata.symbol.toLowerCase();
  assert(validTokenId(tokenId), "Invalid Symbol");

  const attached = near.attachedDeposit();
  assert(
    attached.greaterThanOrEqual(requiredDeposit(args)),
    "Attach at least the required deposit",
  );
  const tokenAccount = tokenId + "." + near.currentAccountId();

  const deployment = new Promise(tokenAccount)
    .createAccount()
    .transfer(attached)
    .deployContract(TOKEN_CODE)
    .addFullAccessKey(near.signerAccountPublicKey())
    .callFunction<InitializeArgs>(
      "initialize",
      new InitializeArgs(args),
      TOKEN_GAS,
    );

  return deployment.then(
    new Promise(near.currentAccountId()).callFunction<CallbackArgs>(
      "create_callback",
      new CallbackArgs(near.predecessorAccountId(), attached),
      CALLBACK_GAS,
    ),
  );
}

@call({ privateMethod: true })
export function create_callback(
  user: string,
  deposit: NearToken
): bool {
  if (near.promiseResult().succeeded()) return true;

  near.log("Error creating token; refunding deposit");
  new Promise(user).transfer(deposit).detach();
  return false;
}
