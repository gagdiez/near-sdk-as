import { JSON } from "json-as";

/** An unsigned 64-bit integer represented as a JSON decimal string. */
@json
export class UInt64 {
  private constructor(private readonly value: u64) {}

  static zero(): UInt64 {
    return new UInt64(0);
  }

  static max(): UInt64 {
    return new UInt64(u64.MAX_VALUE);
  }

  /** Creates a value from a base-10 decimal string. */
  static fromString(value: string): UInt64 {
    assert(value.length > 0, "UInt64 value cannot be empty");
    let result: u64 = 0;
    for (let index = 0; index < value.length; index++) {
      const code = value.charCodeAt(index);
      assert(code >= 48 && code <= 57, "UInt64 value must be decimal");
      const digit = <u64>(code - 48);
      assert(result <= (u64.MAX_VALUE - digit) / 10, "UInt64 value exceeds its maximum");
      result = result * 10 + digit;
    }
    return new UInt64(result);
  }

  /** Creates a JSON-safe value from an AssemblyScript `u64`. */
  static fromU64(value: u64): UInt64 {
    return new UInt64(value);
  }

  @serializer("string")
  serializer(self: UInt64): string {
    return JSON.stringify<string>(self.toString());
  }

  @deserializer("string")
  deserializer(data: string): UInt64 {
    return UInt64.fromString(JSON.parse<string>(data));
  }

  greaterThan(other: UInt64): bool {
    return this.value > other.value;
  }

  greaterThanOrEqual(other: UInt64): bool {
    return this.value >= other.value;
  }

  lessThan(other: UInt64): bool {
    return this.value < other.value;
  }

  lessThanOrEqual(other: UInt64): bool {
    return this.value <= other.value;
  }

  equals(other: UInt64): bool {
    return this.value == other.value;
  }

  isZero(): bool {
    return this.value == 0;
  }

  toU64(): u64 {
    return this.value;
  }

  toString(): string {
    return this.value.toString();
  }
}
