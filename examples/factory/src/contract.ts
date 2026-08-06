import { embed, Gas, JSON, near, Promise } from "near-sdk-as";
import { AccountId } from "near-sdk-as/account-id";
import { NearToken } from "near-sdk-as/near-token";
import { UInt128 } from "near-sdk-as/uint128";

const EXTRA_STORAGE_BYTES: u64 = 10_000;
const STORAGE_BYTE_COST = NearToken.fromYoctoNear("10000000000000000000");
const TOKEN_GAS = Gas.fromTera(50);
const CALLBACK_GAS = Gas.fromTera(30);
const TOKEN_CODE = embed.bytes("../token/build/contract.wasm");

@json
export class TokenMetadata {
  spec: string;
  name: string;
  symbol: string;
  decimals: u8;
  icon: string | null;
  reference: string | null;
  reference_hash: string | null;

  constructor(spec: string = "", name: string = "", symbol: string = "", decimals: u8 = 0, icon: string | null = null, reference: string | null = null, reference_hash: string | null = null) {
    this.spec = spec;
    this.name = name;
    this.symbol = symbol;
    this.decimals = decimals;
    this.icon = icon;
    this.reference = reference;
    this.reference_hash = reference_hash;
  }
}

@json
export class TokenArgs {
  owner_id: string;
  @alias("total_supply")
  __total_supply: string;
  metadata: TokenMetadata;

  constructor(owner_id: string = "", total_supply: UInt128 = UInt128.zero(), metadata: TokenMetadata = new TokenMetadata()) {
    this.owner_id = owner_id;
    this.__total_supply = total_supply.toString();
    this.metadata = metadata;
  }

  get total_supply(): UInt128 {
    return UInt128.fromString(this.__total_supply);
  }

  set total_supply(value: UInt128) {
    this.__total_supply = value.toString();
  }
}

@json
class CallbackArgs {
  user: string;
  deposit: NearToken;

  constructor(user: string, deposit: NearToken) {
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
  AccountId.fromString(args.owner_id);
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
  AccountId.fromString(args.owner_id);
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
    .callFunction<TokenArgs>(
      "initialize",
      args,
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
