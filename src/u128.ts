/** An unsigned 128-bit integer. NEAR JSON represents this value as a decimal string. */
@json
export class U128 {
  constructor(
    /** @internal Low 64-bit limb used by contract-state serialization. */
    readonly __low: u64 = 0,
    /** @internal High 64-bit limb used by contract-state serialization. */
    readonly __high: u64 = 0,
  ) {}

  static zero(): U128 {
    return new U128(0, 0);
  }

  static max(): U128 {
    return new U128(u64.MAX_VALUE, u64.MAX_VALUE);
  }

  static fromString(value: string): U128 {
    assert(value.length > 0, "U128 value cannot be empty");
    let low: u64 = 0;
    let high: u64 = 0;
    const mask: u64 = 0xffff_ffff;

    for (let i = 0; i < value.length; i++) {
      const code = value.charCodeAt(i);
      assert(code >= 48 && code <= 57, "U128 value must be decimal");
      const digit = <u64>(code - 48);

      const lowProduct = (low & mask) * 10;
      const upperLowProduct = (low >> 32) * 10 + (lowProduct >> 32);
      const nextLow = (upperLowProduct << 32) | (lowProduct & mask);
      const carry = upperLowProduct >> 32;

      const highProduct = (high & mask) * 10 + carry;
      const upperHighProduct = (high >> 32) * 10 + (highProduct >> 32);
      assert(upperHighProduct <= mask, "U128 value exceeds its maximum");
      let nextHigh = (upperHighProduct << 32) | (highProduct & mask);

      const withDigit = nextLow + digit;
      if (withDigit < nextLow) {
        assert(nextHigh != u64.MAX_VALUE, "U128 value exceeds its maximum");
        nextHigh++;
      }
      low = withDigit;
      high = nextHigh;
    }
    return new U128(low, high);
  }

  static fromU64(value: u64): U128 {
    return new U128(value, 0);
  }

  /** @internal Creates a value from its little-endian representation. */
  static __fromBytes(bytes: Uint8Array): U128 {
    assert(bytes.length == 16, "U128 requires exactly 16 bytes");
    return new U128(
      load<u64>(bytes.dataStart),
      load<u64>(bytes.dataStart + 8),
    );
  }

  greaterThanOrEqual(other: U128): bool {
    return this.__high > other.__high ||
      (this.__high == other.__high && this.__low >= other.__low);
  }

  lessThan(other: U128): bool {
    return this.__high < other.__high ||
      (this.__high == other.__high && this.__low < other.__low);
  }

  lessThanOrEqual(other: U128): bool {
    return this.__high < other.__high ||
      (this.__high == other.__high && this.__low <= other.__low);
  }

  equals(other: U128): bool {
    return this.__low == other.__low && this.__high == other.__high;
  }

  greaterThan(other: U128): bool {
    return this.__high > other.__high ||
      (this.__high == other.__high && this.__low > other.__low);
  }

  isZero(): bool {
    return this.__low == 0 && this.__high == 0;
  }

  checkedAdd(other: U128): U128 | null {
    const low = this.__low + other.__low;
    const carry: u64 = low < this.__low ? 1 : 0;
    const partialHigh = this.__high + other.__high;
    if (partialHigh < this.__high) return null;
    const high = partialHigh + carry;
    return high < partialHigh ? null : new U128(low, high);
  }

  checkedSub(other: U128): U128 | null {
    if (!this.greaterThanOrEqual(other)) return null;
    const borrow: u64 = this.__low < other.__low ? 1 : 0;
    return new U128(this.__low - other.__low, this.__high - other.__high - borrow);
  }

  /** Returns the product, or `null` when it exceeds `u128`. */
  checkedMul(other: U128): U128 | null {
    let result = U128.zero();
    let addend = this;
    for (let bit = 0; bit < 128; bit++) {
      if (other.__bitAt(bit)) {
        const next = result.checkedAdd(addend);
        if (next == null) return null;
        result = next;
      }
      if (bit < 127 && other.__hasBitAfter(bit)) {
        const next = addend.__shiftLeftOne();
        if (next == null) return null;
        addend = next;
      }
    }
    return result;
  }

  /** Returns the product with a machine-sized multiplier, or `null` on overflow. */
  checkedMulU64(multiplier: u64): U128 | null {
    return this.checkedMul(U128.fromU64(multiplier));
  }

  add(other: U128): U128 {
    const result = this.checkedAdd(other);
    assert(result != null, "U128 addition overflow");
    return result!;
  }

  sub(other: U128): U128 {
    const result = this.checkedSub(other);
    assert(result != null, "U128 subtraction underflow");
    return result!;
  }

  mul(other: U128): U128 {
    const result = this.checkedMul(other);
    assert(result != null, "U128 multiplication overflow");
    return result!;
  }

  mulU64(multiplier: u64): U128 {
    const result = this.checkedMulU64(multiplier);
    assert(result != null, "U128 multiplication overflow");
    return result!;
  }

  checkedDiv(other: U128): U128 | null {
    if (other.isZero()) return null;
    return this.__divRem(other).quotient;
  }

  checkedRem(other: U128): U128 | null {
    if (other.isZero()) return null;
    return this.__divRem(other).remainder;
  }

  div(other: U128): U128 {
    const result = this.checkedDiv(other);
    assert(result != null, "U128 division by zero");
    return result!;
  }

  rem(other: U128): U128 {
    const result = this.checkedRem(other);
    assert(result != null, "U128 division by zero");
    return result!;
  }

  saturatingAdd(other: U128): U128 {
    const result = this.checkedAdd(other);
    return result == null ? U128.max() : result;
  }

  saturatingSub(other: U128): U128 {
    const result = this.checkedSub(other);
    return result == null ? U128.zero() : result;
  }

  saturatingMul(other: U128): U128 {
    const result = this.checkedMul(other);
    return result == null ? U128.max() : result;
  }

  saturatingMulU64(multiplier: u64): U128 {
    const result = this.checkedMulU64(multiplier);
    return result == null ? U128.max() : result;
  }

  private __bitAt(index: i32): bool {
    return index < 64
      ? ((this.__low >> <u64>index) & 1) == 1
      : ((this.__high >> <u64>(index - 64)) & 1) == 1;
  }

  private __hasBitAfter(index: i32): bool {
    for (let bit = index + 1; bit < 128; bit++) {
      if (this.__bitAt(bit)) return true;
    }
    return false;
  }

  private __shiftLeftOne(): U128 | null {
    if ((this.__high >> 63) != 0) return null;
    return new U128(this.__low << 1, (this.__high << 1) | (this.__low >> 63));
  }

  private __divRem(divisor: U128): U128Division {
    let quotientLow: u64 = 0;
    let quotientHigh: u64 = 0;
    let remainder = U128.zero();

    for (let bit = 127; bit >= 0; bit--) {
      const overflow = (remainder.__high >> 63) != 0;
      remainder = new U128(
        (remainder.__low << 1) | (this.__bitAt(bit) ? 1 : 0),
        (remainder.__high << 1) | (remainder.__low >> 63),
      );
      if (overflow || remainder.greaterThanOrEqual(divisor)) {
        remainder = remainder.__wrappingSub(divisor);
        if (bit < 64) quotientLow |= <u64>1 << <u64>bit;
        else quotientHigh |= <u64>1 << <u64>(bit - 64);
      }
    }
    return new U128Division(new U128(quotientLow, quotientHigh), remainder);
  }

  private __wrappingSub(other: U128): U128 {
    const borrow: u64 = this.__low < other.__low ? 1 : 0;
    return new U128(this.__low - other.__low, this.__high - other.__high - borrow);
  }

  /** @internal Encodes this value as little-endian bytes. */
  __toBytes(): Uint8Array {
    const bytes = new Uint8Array(16);
    store<u64>(bytes.dataStart, this.__low);
    store<u64>(bytes.dataStart + 8, this.__high);
    return bytes;
  }

  toString(): string {
    if (this.isZero()) return "0";

    const words = new StaticArray<u32>(4);
    words[0] = <u32>(this.__high >> 32);
    words[1] = <u32>this.__high;
    words[2] = <u32>(this.__low >> 32);
    words[3] = <u32>this.__low;
    let result = "";

    while (words[0] != 0 || words[1] != 0 || words[2] != 0 || words[3] != 0) {
      let remainder: u64 = 0;
      for (let i = 0; i < 4; i++) {
        const value = (remainder << 32) | <u64>words[i];
        words[i] = <u32>(value / 10);
        remainder = value % 10;
      }
      result = String.fromCharCode(<i32>remainder + 48) + result;
    }
    return result;
  }
}

class U128Division {
  constructor(readonly quotient: U128, readonly remainder: U128) {}
}
