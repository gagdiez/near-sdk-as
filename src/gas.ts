/** A NEAR gas amount. */
export class Gas {
  private constructor(private readonly value: u64) {}

  /** Creates an amount from raw gas units. */
  static fromGas(amount: u64): Gas {
    return new Gas(amount);
  }

  /** Creates an amount from teraGas units (10^12 gas). */
  static fromTera(amount: u64): Gas {
    const tera: u64 = 1_000_000_000_000;
    assert(amount <= u64.MAX_VALUE / tera, "Gas amount is too large");
    return new Gas(amount * tera);
  }

  /** @internal Raw gas units passed to the NEAR host. */
  units(): u64 {
    return this.value;
  }
}

/** Relative share of unused gas assigned to a weighted function call. */
export class GasWeight {
  constructor(readonly value: u64 = 0) {}

  isZero(): bool {
    return this.value == 0;
  }
}
