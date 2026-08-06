import { NearToken } from "./near-sdk-as/near-token";

/** A NEAR public key encoded as the host ABI's curve byte plus key bytes. */
export class PublicKey {
  private constructor(private readonly value: Uint8Array) {}

  static fromBytes(value: Uint8Array): PublicKey {
    assert(value.length == 33 || value.length == 65, "Invalid NEAR public key length");
    const copy = new Uint8Array(value.length);
    memory.copy(copy.dataStart, value.dataStart, value.length);
    return new PublicKey(copy);
  }

  /** @internal Returns the host-encoded public key bytes. */
  bytes(): Uint8Array {
    return this.value;
  }
}

/**
 * Allowance for a function-call access key.
 *
 * NEAR encodes an unlimited allowance as the all-zero `u128` value.
 */
export class Allowance {
  private constructor(private readonly amount: NearToken) {}

  static unlimited(): Allowance {
    return new Allowance(NearToken.zero());
  }

  static limited(amount: NearToken): Allowance {
    assert(!amount.isZero(), "A limited allowance must be greater than zero");
    return new Allowance(amount);
  }

  /** @internal Encodes the allowance for the host ABI. */
  bytes(): Uint8Array {
    return this.amount.__toBytes();
  }
}
