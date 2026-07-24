// NEAR's Wasm ABI uses i64 values for lengths, pointers, and register IDs.
// Keep this low-level surface private; the rest of the SDK deals in AS values.
export namespace host {
  @external("env", "read_register")
  export declare function readRegister(registerId: u64, pointer: u64): void;

  @external("env", "register_len")
  export declare function registerLength(registerId: u64): u64;

  @external("env", "current_account_id")
  export declare function currentAccountId(registerId: u64): void;

  @external("env", "signer_account_id")
  export declare function signerAccountId(registerId: u64): void;

  @external("env", "signer_account_pk")
  export declare function signerAccountPublicKey(registerId: u64): void;

  @external("env", "predecessor_account_id")
  export declare function predecessorAccountId(registerId: u64): void;

  @external("env", "random_seed")
  export declare function randomSeed(registerId: u64): void;

  @external("env", "input")
  export declare function input(registerId: u64): void;

  @external("env", "block_height")
  export declare function blockHeight(): u64;

  @external("env", "block_timestamp")
  export declare function blockTimestamp(): u64;

  @external("env", "epoch_height")
  export declare function epochHeight(): u64;

  @external("env", "storage_usage")
  export declare function storageUsage(): u64;

  @external("env", "account_balance")
  export declare function accountBalance(pointer: u64): void;

  @external("env", "account_locked_balance")
  export declare function accountLockedBalance(pointer: u64): void;

  @external("env", "attached_deposit")
  export declare function attachedDeposit(pointer: u64): void;

  @external("env", "prepaid_gas")
  export declare function prepaidGas(): u64;

  @external("env", "used_gas")
  export declare function usedGas(): u64;

  @external("env", "sha256")
  export declare function sha256(
    valueLength: u64,
    valuePointer: u64,
    registerId: u64,
  ): void;

  @external("env", "keccak256")
  export declare function keccak256(
    valueLength: u64,
    valuePointer: u64,
    registerId: u64,
  ): void;

  @external("env", "keccak512")
  export declare function keccak512(
    valueLength: u64,
    valuePointer: u64,
    registerId: u64,
  ): void;


  @external("env", "value_return")
  export declare function valueReturn(length: u64, pointer: u64): void;

  @external("env", "panic_utf8")
  export declare function panicUtf8(length: u64, pointer: u64): void;

  @external("env", "log_utf8")
  export declare function logUtf8(length: u64, pointer: u64): void;

  @external("env", "promise_batch_create")
  export declare function promiseBatchCreate(
    accountIdLength: u64,
    accountIdPointer: u64,
  ): u64;

  @external("env", "promise_batch_then")
  export declare function promiseBatchThen(
    promiseIndex: u64,
    accountIdLength: u64,
    accountIdPointer: u64,
  ): u64;

  @external("env", "promise_and")
  export declare function promiseAnd(indicesPointer: u64, indicesCount: u64): u64;

  @external("env", "promise_batch_action_function_call")
  export declare function promiseBatchActionFunctionCall(
    promiseIndex: u64,
    methodNameLength: u64,
    methodNamePointer: u64,
    argumentsLength: u64,
    argumentsPointer: u64,
    amountPointer: u64,
    gas: u64,
  ): void;

  @external("env", "promise_batch_action_function_call_weight")
  export declare function promiseBatchActionFunctionCallWeight(
    promiseIndex: u64,
    methodNameLength: u64,
    methodNamePointer: u64,
    argumentsLength: u64,
    argumentsPointer: u64,
    amountPointer: u64,
    gas: u64,
    weight: u64,
  ): void;

  @external("env", "promise_batch_action_create_account")
  export declare function promiseBatchActionCreateAccount(promiseIndex: u64): void;

  @external("env", "promise_batch_action_deploy_contract")
  export declare function promiseBatchActionDeployContract(
    promiseIndex: u64,
    codeLength: u64,
    codePointer: u64,
  ): void;

  @external("env", "promise_batch_action_stake")
  export declare function promiseBatchActionStake(
    promiseIndex: u64,
    amountPointer: u64,
    publicKeyLength: u64,
    publicKeyPointer: u64,
  ): void;

  @external("env", "promise_batch_action_add_key_with_full_access")
  export declare function promiseBatchActionAddFullAccessKey(
    promiseIndex: u64,
    publicKeyLength: u64,
    publicKeyPointer: u64,
    nonce: u64,
  ): void;

  @external("env", "promise_batch_action_add_key_with_function_call")
  export declare function promiseBatchActionAddAccessKey(
    promiseIndex: u64,
    publicKeyLength: u64,
    publicKeyPointer: u64,
    nonce: u64,
    allowancePointer: u64,
    receiverIdLength: u64,
    receiverIdPointer: u64,
    methodNamesLength: u64,
    methodNamesPointer: u64,
  ): void;

  @external("env", "promise_batch_action_delete_key")
  export declare function promiseBatchActionDeleteKey(
    promiseIndex: u64,
    publicKeyLength: u64,
    publicKeyPointer: u64,
  ): void;

  @external("env", "promise_batch_action_delete_account")
  export declare function promiseBatchActionDeleteAccount(
    promiseIndex: u64,
    beneficiaryIdLength: u64,
    beneficiaryIdPointer: u64,
  ): void;

  @external("env", "promise_batch_action_deploy_global_contract")
  export declare function promiseBatchActionDeployGlobalContract(
    promiseIndex: u64,
    codeLength: u64,
    codePointer: u64,
  ): void;

  @external("env", "promise_batch_action_deploy_global_contract_by_account_id")
  export declare function promiseBatchActionDeployGlobalContractByAccountId(
    promiseIndex: u64,
    codeLength: u64,
    codePointer: u64,
  ): void;

  @external("env", "promise_batch_action_use_global_contract")
  export declare function promiseBatchActionUseGlobalContract(
    promiseIndex: u64,
    codeHashLength: u64,
    codeHashPointer: u64,
  ): void;

  @external("env", "promise_batch_action_use_global_contract_by_account_id")
  export declare function promiseBatchActionUseGlobalContractByAccountId(
    promiseIndex: u64,
    accountIdLength: u64,
    accountIdPointer: u64,
  ): void;

  @external("env", "promise_batch_action_transfer_to_gas_key")
  export declare function promiseBatchActionTransferToGasKey(
    promiseIndex: u64,
    publicKeyLength: u64,
    publicKeyPointer: u64,
    amountPointer: u64,
  ): void;

  @external("env", "promise_batch_action_add_gas_key_with_full_access")
  export declare function promiseBatchActionAddGasKeyFullAccess(
    promiseIndex: u64,
    publicKeyLength: u64,
    publicKeyPointer: u64,
    numberOfNonces: u64,
  ): void;

  @external("env", "promise_batch_action_add_gas_key_with_function_call")
  export declare function promiseBatchActionAddGasKeyAccess(
    promiseIndex: u64,
    publicKeyLength: u64,
    publicKeyPointer: u64,
    numberOfNonces: u64,
    allowancePointer: u64,
    receiverIdLength: u64,
    receiverIdPointer: u64,
    methodNamesLength: u64,
    methodNamesPointer: u64,
  ): void;

  @external("env", "promise_batch_action_transfer")
  export declare function promiseBatchActionTransfer(
    promiseIndex: u64,
    amountPointer: u64,
  ): void;

  @external("env", "promise_results_count")
  export declare function promiseResultsCount(): u64;

  @external("env", "promise_result")
  export declare function promiseResult(resultIndex: u64, registerId: u64): u64;

  @external("env", "promise_return")
  export declare function promiseReturn(promiseIndex: u64): void;

  @external("env", "storage_write")
  export declare function storageWrite(
    keyLength: u64,
    keyPointer: u64,
    valueLength: u64,
    valuePointer: u64,
    registerId: u64,
  ): u64;

  @external("env", "storage_read")
  export declare function storageRead(
    keyLength: u64,
    keyPointer: u64,
    registerId: u64,
  ): u64;

  @external("env", "storage_remove")
  export declare function storageRemove(
    keyLength: u64,
    keyPointer: u64,
    registerId: u64,
  ): u64;

  @external("env", "storage_has_key")
  export declare function storageHasKey(keyLength: u64, keyPointer: u64): u64;
}
