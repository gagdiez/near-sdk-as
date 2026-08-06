import { UInt128 } from "near-sdk-as/uint128";
import { jsonToken, ownerTokenIds } from "./internal";
import { JsonToken } from "./metadata";
import { state } from "./lib.near.generated";

const DEFAULT_LIMIT: u32 = 50;

export function totalSupply(): UInt128 { return UInt128.fromU64(state.all_token_ids.length); }

export function tokens(from: u32, limit: u32 = DEFAULT_LIMIT): JsonToken[] {
  const result = new Array<JsonToken>();
  const until = min<u32>(state.all_token_ids.length, from + limit);
  for (let index = from; index < until; index++) result.push(jsonToken(state.all_token_ids.getSome(index))!);
  return result;
}

export function supplyForOwner(ownerId: string): UInt128 {
  return UInt128.fromU64(ownerTokenIds(ownerId).length);
}

export function tokensForOwner(ownerId: string, from: u32, limit: u32 = DEFAULT_LIMIT): JsonToken[] {
  const ids = ownerTokenIds(ownerId);
  const result = new Array<JsonToken>();
  const until = min<i32>(ids.length, <i32>(from + limit));
  for (let index = <i32>from; index < until; index++) result.push(jsonToken(ids[index])!);
  return result;
}
