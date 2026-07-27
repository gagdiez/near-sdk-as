import { JSON } from "json-as";
import { UInt128 } from "./uint128";

/** A native NEAR amount represented in yoctoNEAR. */
@json
export class NearToken {
  private constructor(private readonly value: UInt128) {}

  static zero(): NearToken {
    return new NearToken(UInt128.zero());
  }

  static max(): NearToken {
    return new NearToken(UInt128.max());
  }

  /** Creates an amount from decimal yoctoNEAR. */
  static fromYoctoNear(value: string): NearToken {
    return new NearToken(UInt128.fromString(value));
  }

  static fromMicroNear(amount: u64): NearToken {
    return NearToken.fromUnit(amount, "1000000000000000000");
  }

  static fromMilliNear(amount: u64): NearToken {
    return NearToken.fromUnit(amount, "1000000000000000000000");
  }

  static fromNear(amount: u64): NearToken {
    return NearToken.fromUnit(amount, "1000000000000000000000000");
  }

  private static fromUnit(amount: u64, unit: string): NearToken {
    const result = UInt128.fromString(unit).checkedMulU64(amount);
    assert(result != null, "NearToken amount exceeds u128");
    return new NearToken(result!);
  }

  /** @internal Creates an amount from the NEAR host ABI representation. */
  static __fromBytes(bytes: Uint8Array): NearToken {
    return new NearToken(UInt128.__fromBytes(bytes));
  }

  @serializer("string")
  serializer(self: NearToken): string {
    return JSON.stringify<string>(self.toString());
  }

  @deserializer("string")
  deserializer(data: string): NearToken {
    return NearToken.fromYoctoNear(JSON.parse<string>(data));
  }

  greaterThanOrEqual(other: NearToken): bool {
    return this.value.greaterThanOrEqual(other.value);
  }

  greaterThan(other: NearToken): bool {
    return this.value.greaterThan(other.value);
  }

  isZero(): bool {
    return this.value.isZero();
  }

  asYoctoNear(): string {
    return this.toString();
  }

  asMicroNear(): string {
    return this.withoutDecimalPlaces(18);
  }

  asMilliNear(): string {
    return this.withoutDecimalPlaces(21);
  }

  asNear(): string {
    return this.withoutDecimalPlaces(24);
  }

  private withoutDecimalPlaces(places: i32): string {
    const value = this.toString();
    return value.length <= places ? "0" : value.substring(0, value.length - places);
  }

  checkedAdd(other: NearToken): NearToken | null {
    const result = this.value.checkedAdd(other.value);
    return result == null ? null : new NearToken(result);
  }

  checkedSub(other: NearToken): NearToken | null {
    const result = this.value.checkedSub(other.value);
    return result == null ? null : new NearToken(result);
  }

  checkedMul(multiplier: u64): NearToken | null {
    const result = this.value.checkedMulU64(multiplier);
    return result == null ? null : new NearToken(result);
  }

  saturatingAdd(other: NearToken): NearToken {
    return new NearToken(this.value.saturatingAdd(other.value));
  }

  saturatingSub(other: NearToken): NearToken {
    return new NearToken(this.value.saturatingSub(other.value));
  }

  saturatingMul(multiplier: u64): NearToken {
    return new NearToken(this.value.saturatingMulU64(multiplier));
  }

  /** @internal Encodes this amount for NEAR host calls. */
  __toBytes(): Uint8Array {
    return this.value.__toBytes();
  }

  toString(): string {
    return this.value.toString();
  }
}
