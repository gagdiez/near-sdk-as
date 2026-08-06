import { JSON } from "json-as";
import { fromBytes, readRegister, toBytes } from "./internal/bytes";
import { host } from "./internal/host";
import { NearToken } from "./near-sdk-as/near-token";
import { Gas, GasWeight } from "./gas";
import { Allowance, PublicKey } from "./public-key";

const PROMISE_RESULT_REGISTER: u64 = 3;

const ACTION_CREATE_ACCOUNT: u8 = 0;
const ACTION_TRANSFER: u8 = 1;
const ACTION_DEPLOY_CONTRACT: u8 = 2;
const ACTION_CALL_FUNCTION: u8 = 3;
const ACTION_STAKE: u8 = 4;
const ACTION_ADD_FULL_ACCESS_KEY: u8 = 5;
const ACTION_ADD_ACCESS_KEY: u8 = 6;
const ACTION_DELETE_KEY: u8 = 7;
const ACTION_DELETE_ACCOUNT: u8 = 8;
const ACTION_DEPLOY_GLOBAL_CONTRACT: u8 = 9;
const ACTION_DEPLOY_GLOBAL_CONTRACT_BY_ACCOUNT_ID: u8 = 10;
const ACTION_USE_GLOBAL_CONTRACT: u8 = 11;
const ACTION_USE_GLOBAL_CONTRACT_BY_ACCOUNT_ID: u8 = 12;
const ACTION_TRANSFER_TO_GAS_KEY: u8 = 13;
const ACTION_ADD_GAS_KEY_FULL_ACCESS: u8 = 14;
const ACTION_ADD_GAS_KEY_ACCESS: u8 = 15;

class PromiseAction {
  methodName: string = "";
  bytes: Uint8Array = new Uint8Array(0);
  gas: Gas = Gas.fromTera(0);
  weight: GasWeight = new GasWeight();
  amount: NearToken = NearToken.zero();
  publicKey: PublicKey | null = null;
  nonce: u64 = 0;
  receiverId: string = "";
  functionNames: string = "";

  constructor(readonly kind: u8) {}
}

/**
 * A lazy description of a NEAR receipt.
 *
 * Nothing is scheduled while the graph is being assembled. Returning the
 * promise from an endpoint materializes the graph and makes its final receipt
 * the endpoint result.
 */
export class Promise {
  private readonly actions: PromiseAction[] = [];
  private dependency: Promise | null = null;
  private readonly joined: Promise[] = [];
  private scheduledIndex: u64 = u64.MAX_VALUE;

  constructor(readonly accountId: string) {}

  private addAction(action: PromiseAction): Promise {
    assert(this.joined.length == 0, "Cannot add actions after joining promises");
    assert(this.scheduledIndex == u64.MAX_VALUE, "Promise is already scheduled");
    this.actions.push(action);
    return this;
  }

  /** Adds an account-creation action to this receipt. */
  createAccount(): Promise {
    return this.addAction(new PromiseAction(ACTION_CREATE_ACCOUNT));
  }

  /** Adds a native NEAR transfer action to this receipt. */
  transfer(amount: NearToken): Promise {
    const action = new PromiseAction(ACTION_TRANSFER);
    action.amount = amount;
    return this.addAction(action);
  }

  /** Adds a contract deployment action to this receipt. */
  deployContract(code: Uint8Array): Promise {
    const action = new PromiseAction(ACTION_DEPLOY_CONTRACT);
    action.bytes = code;
    return this.addAction(action);
  }

  /** Adds a JSON function-call action to this receipt. */
  callFunction<A>(
    methodName: string,
    args: A,
    gas: Gas,
    deposit: NearToken = NearToken.zero(),
    weight: GasWeight = new GasWeight(),
  ): Promise {
    const json = JSON.stringify<A>(args);
    const action = new PromiseAction(ACTION_CALL_FUNCTION);
    action.methodName = methodName;
    action.bytes = toBytes(json);
    action.gas = gas;
    action.amount = deposit;
    action.weight = weight;
    return this.addAction(action);
  }

  stake(amount: NearToken, publicKey: PublicKey): Promise {
    const action = new PromiseAction(ACTION_STAKE);
    action.amount = amount;
    action.publicKey = publicKey;
    return this.addAction(action);
  }

  addFullAccessKey(publicKey: PublicKey, nonce: u64 = 0): Promise {
    const action = new PromiseAction(ACTION_ADD_FULL_ACCESS_KEY);
    action.publicKey = publicKey;
    action.nonce = nonce;
    return this.addAction(action);
  }

  addAccessKey(
    publicKey: PublicKey,
    allowance: Allowance,
    receiverId: string,
    functionNames: string,
    nonce: u64 = 0,
  ): Promise {
    const action = new PromiseAction(ACTION_ADD_ACCESS_KEY);
    action.publicKey = publicKey;
    action.bytes = allowance.bytes();
    action.receiverId = receiverId;
    action.functionNames = functionNames;
    action.nonce = nonce;
    return this.addAction(action);
  }

  deleteKey(publicKey: PublicKey): Promise {
    const action = new PromiseAction(ACTION_DELETE_KEY);
    action.publicKey = publicKey;
    return this.addAction(action);
  }

  deleteAccount(beneficiaryId: string): Promise {
    const action = new PromiseAction(ACTION_DELETE_ACCOUNT);
    action.receiverId = beneficiaryId;
    return this.addAction(action);
  }

  deployGlobalContract(code: Uint8Array): Promise {
    const action = new PromiseAction(ACTION_DEPLOY_GLOBAL_CONTRACT);
    action.bytes = code;
    return this.addAction(action);
  }

  deployGlobalContractByAccountId(code: Uint8Array): Promise {
    const action = new PromiseAction(ACTION_DEPLOY_GLOBAL_CONTRACT_BY_ACCOUNT_ID);
    action.bytes = code;
    return this.addAction(action);
  }

  useGlobalContract(codeHash: Uint8Array): Promise {
    assert(codeHash.length == 32, "Global contract code hash must be 32 bytes");
    const action = new PromiseAction(ACTION_USE_GLOBAL_CONTRACT);
    action.bytes = codeHash;
    return this.addAction(action);
  }

  useGlobalContractByAccountId(accountId: string): Promise {
    const action = new PromiseAction(ACTION_USE_GLOBAL_CONTRACT_BY_ACCOUNT_ID);
    action.receiverId = accountId;
    return this.addAction(action);
  }

  transferToGasKey(publicKey: PublicKey, amount: NearToken): Promise {
    const action = new PromiseAction(ACTION_TRANSFER_TO_GAS_KEY);
    action.publicKey = publicKey;
    action.amount = amount;
    return this.addAction(action);
  }

  addGasKeyFullAccess(publicKey: PublicKey, numberOfNonces: u32): Promise {
    const action = new PromiseAction(ACTION_ADD_GAS_KEY_FULL_ACCESS);
    action.publicKey = publicKey;
    action.nonce = numberOfNonces;
    return this.addAction(action);
  }

  addGasKeyAllowanceFunctionCall(
    publicKey: PublicKey,
    numberOfNonces: u32,
    allowance: Allowance,
    receiverId: string,
    functionNames: string,
  ): Promise {
    const action = new PromiseAction(ACTION_ADD_GAS_KEY_ACCESS);
    action.publicKey = publicKey;
    action.nonce = numberOfNonces;
    action.bytes = allowance.bytes();
    action.receiverId = receiverId;
    action.functionNames = functionNames;
    return this.addAction(action);
  }

  /** Runs `callback` after this promise and returns the callback promise. */
  then(callback: Promise): Promise {
    assert(callback.dependency === null, "Callback promise already has a dependency");
    assert(callback.scheduledIndex == u64.MAX_VALUE, "Callback promise is already scheduled");
    callback.dependency = this;
    return callback;
  }

  /** Joins this promise with another independently scheduled promise. */
  and(other: Promise): Promise {
    assert(this.scheduledIndex == u64.MAX_VALUE, "Promise is already scheduled");
    assert(other.scheduledIndex == u64.MAX_VALUE, "Promise is already scheduled");
    this.joined.push(other);
    return this;
  }

  /** Schedules this promise without making it the endpoint result. */
  detach(): void {
    this.__schedule();
  }

  /** Schedules this promise and marks it as the endpoint result. */
  asReturn(): Promise {
    host.promiseReturn(this.__schedule());
    return this;
  }

  /** @internal Used by generated endpoint bindings. */
  __schedule(): u64 {
    if (this.scheduledIndex != u64.MAX_VALUE) return this.scheduledIndex;

    const account = toBytes(this.accountId);
    this.scheduledIndex = this.dependency === null
      ? host.promiseBatchCreate(<u64>account.length, <u64>account.dataStart)
      : host.promiseBatchThen(
          this.dependency!.__schedule(),
          <u64>account.length,
          <u64>account.dataStart,
        );

    for (let i = 0; i < this.actions.length; i++) {
      const action = this.actions[i];
      if (action.kind == ACTION_CREATE_ACCOUNT) {
        host.promiseBatchActionCreateAccount(this.scheduledIndex);
        continue;
      }
      if (action.kind == ACTION_TRANSFER) {
        const amount = action.amount.__toBytes();
        host.promiseBatchActionTransfer(this.scheduledIndex, <u64>amount.dataStart);
        continue;
      }
      if (action.kind == ACTION_DEPLOY_CONTRACT) {
        host.promiseBatchActionDeployContract(
          this.scheduledIndex,
          <u64>action.bytes.length,
          <u64>action.bytes.dataStart,
        );
        continue;
      }

      if (action.kind == ACTION_STAKE) {
        const amount = action.amount.__toBytes();
        const key = action.publicKey!.bytes();
        host.promiseBatchActionStake(
          this.scheduledIndex,
          <u64>amount.dataStart,
          <u64>key.length,
          <u64>key.dataStart,
        );
        continue;
      }
      if (action.kind == ACTION_ADD_FULL_ACCESS_KEY) {
        const key = action.publicKey!.bytes();
        host.promiseBatchActionAddFullAccessKey(
          this.scheduledIndex,
          <u64>key.length,
          <u64>key.dataStart,
          action.nonce,
        );
        continue;
      }
      if (action.kind == ACTION_ADD_ACCESS_KEY) {
        const key = action.publicKey!.bytes();
        const receiver = toBytes(action.receiverId);
        const methods = toBytes(action.functionNames);
        host.promiseBatchActionAddAccessKey(
          this.scheduledIndex,
          <u64>key.length,
          <u64>key.dataStart,
          action.nonce,
          <u64>action.bytes.dataStart,
          <u64>receiver.length,
          <u64>receiver.dataStart,
          <u64>methods.length,
          <u64>methods.dataStart,
        );
        continue;
      }
      if (action.kind == ACTION_DELETE_KEY) {
        const key = action.publicKey!.bytes();
        host.promiseBatchActionDeleteKey(
          this.scheduledIndex,
          <u64>key.length,
          <u64>key.dataStart,
        );
        continue;
      }
      if (action.kind == ACTION_DELETE_ACCOUNT) {
        const beneficiary = toBytes(action.receiverId);
        host.promiseBatchActionDeleteAccount(
          this.scheduledIndex,
          <u64>beneficiary.length,
          <u64>beneficiary.dataStart,
        );
        continue;
      }
      if (action.kind == ACTION_DEPLOY_GLOBAL_CONTRACT ||
          action.kind == ACTION_DEPLOY_GLOBAL_CONTRACT_BY_ACCOUNT_ID) {
        if (action.kind == ACTION_DEPLOY_GLOBAL_CONTRACT) {
          host.promiseBatchActionDeployGlobalContract(
            this.scheduledIndex,
            <u64>action.bytes.length,
            <u64>action.bytes.dataStart,
          );
        } else {
          host.promiseBatchActionDeployGlobalContractByAccountId(
            this.scheduledIndex,
            <u64>action.bytes.length,
            <u64>action.bytes.dataStart,
          );
        }
        continue;
      }
      if (action.kind == ACTION_USE_GLOBAL_CONTRACT) {
        host.promiseBatchActionUseGlobalContract(
          this.scheduledIndex,
          <u64>action.bytes.length,
          <u64>action.bytes.dataStart,
        );
        continue;
      }
      if (action.kind == ACTION_USE_GLOBAL_CONTRACT_BY_ACCOUNT_ID) {
        const deployer = toBytes(action.receiverId);
        host.promiseBatchActionUseGlobalContractByAccountId(
          this.scheduledIndex,
          <u64>deployer.length,
          <u64>deployer.dataStart,
        );
        continue;
      }
      if (action.kind == ACTION_TRANSFER_TO_GAS_KEY) {
        const key = action.publicKey!.bytes();
        const amount = action.amount.__toBytes();
        host.promiseBatchActionTransferToGasKey(
          this.scheduledIndex,
          <u64>key.length,
          <u64>key.dataStart,
          <u64>amount.dataStart,
        );
        continue;
      }
      if (action.kind == ACTION_ADD_GAS_KEY_FULL_ACCESS) {
        const key = action.publicKey!.bytes();
        host.promiseBatchActionAddGasKeyFullAccess(
          this.scheduledIndex,
          <u64>key.length,
          <u64>key.dataStart,
          action.nonce,
        );
        continue;
      }
      if (action.kind == ACTION_ADD_GAS_KEY_ACCESS) {
        const key = action.publicKey!.bytes();
        const receiver = toBytes(action.receiverId);
        const methods = toBytes(action.functionNames);
        host.promiseBatchActionAddGasKeyAccess(
          this.scheduledIndex,
          <u64>key.length,
          <u64>key.dataStart,
          action.nonce,
          <u64>action.bytes.dataStart,
          <u64>receiver.length,
          <u64>receiver.dataStart,
          <u64>methods.length,
          <u64>methods.dataStart,
        );
        continue;
      }

      const method = toBytes(action.methodName);
      const amount = action.amount.__toBytes();
      if (action.weight.isZero()) {
        host.promiseBatchActionFunctionCall(
          this.scheduledIndex,
          <u64>method.length,
          <u64>method.dataStart,
          <u64>action.bytes.length,
          <u64>action.bytes.dataStart,
          <u64>amount.dataStart,
          action.gas.units(),
        );
      } else {
        host.promiseBatchActionFunctionCallWeight(
          this.scheduledIndex,
          <u64>method.length,
          <u64>method.dataStart,
          <u64>action.bytes.length,
          <u64>action.bytes.dataStart,
          <u64>amount.dataStart,
          action.gas.units(),
          action.weight.value,
        );
      }
    }
    if (this.joined.length > 0) {
      const indices = new Array<u64>(this.joined.length + 1);
      indices[0] = this.scheduledIndex;
      for (let i = 0; i < this.joined.length; i++) {
        indices[i + 1] = this.joined[i].__schedule();
      }
      this.scheduledIndex = host.promiseAnd(
        <u64>indices.dataStart,
        <u64>indices.length,
      );
    }
    return this.scheduledIndex;
  }
}

/** The result supplied to a promise callback by the NEAR runtime. */
export class PromiseResult {
  constructor(
    readonly status: u64,
    private readonly bytes: Uint8Array,
  ) {}

  succeeded(): bool {
    return this.status == 1;
  }

  failed(): bool {
    return this.status == 2;
  }

  pending(): bool {
    return this.status == 0;
  }

  value<T>(): T {
    assert(this.succeeded(), "Promise did not succeed");
    return JSON.parse<T>(fromBytes(this.bytes));
  }
}

/** @internal Reads one callback result from the runtime. */
export function __promiseResult(index: u64): PromiseResult {
  assert(index < host.promiseResultsCount(), "Promise result does not exist");
  const status = host.promiseResult(index, PROMISE_RESULT_REGISTER);
  const bytes = status == 1
    ? readRegister(PROMISE_RESULT_REGISTER)!
    : new Uint8Array(0);
  return new PromiseResult(status, bytes);
}
