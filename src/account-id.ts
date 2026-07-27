import { JSON } from "json-as";

/** A syntactically valid NEAR account identifier. */
@json
export class AccountId {
  private constructor(private readonly value: string) {}

  /** Creates a validated account identifier from its JSON/string form. */
  static fromString(value: string): AccountId {
    assert(value.length >= 2 && value.length <= 64, "Invalid account ID length");

    let previousWasSeparator = false;
    for (let index = 0; index < value.length; index++) {
      const code = value.charCodeAt(index);
      const isAlphanumeric = (code >= 48 && code <= 57) || (code >= 97 && code <= 122);
      const isSeparator = code == 45 || code == 95 || code == 46;
      assert(isAlphanumeric || isSeparator, "Invalid character in account ID");
      assert(!(isSeparator && (index == 0 || index == value.length - 1)), "Account ID cannot begin or end with a separator");
      assert(!(isSeparator && previousWasSeparator), "Account ID cannot contain adjacent separators");
      previousWasSeparator = isSeparator;
    }

    return new AccountId(value);
  }

  @serializer("string")
  serializer(self: AccountId): string {
    return JSON.stringify<string>(self.value);
  }

  @deserializer("string")
  deserializer(data: string): AccountId {
    return AccountId.fromString(JSON.parse<string>(data));
  }

  toString(): string {
    return this.value;
  }
}
