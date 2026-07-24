import { JSON } from "json-as";
import { fromBytes, toBytes } from "./bytes";

export namespace codec {
  export function encode<T>(value: T): Uint8Array {
    return toBytes(JSON.stringify<T>(value));
  }

  export function decode<T>(value: Uint8Array): T {
    return JSON.parse<T>(fromBytes(value));
  }
}
