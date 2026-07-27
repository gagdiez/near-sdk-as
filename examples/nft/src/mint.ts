import { mintEvent } from "./events";
import { internalAddTokenToOwner } from "./internal";
import { Token, TokenId, TokenMetadata } from "./metadata";
import { state } from "./lib.near.generated";

export function mint(tokenId: TokenId, ownerId: string, metadata: TokenMetadata): void {
  assert(!state.tokens_by_id.has(tokenId), "Token already exists");
  const token = new Token(ownerId, [], 0);
  state.tokens_by_id.set(tokenId, token);
  state.token_metadata_by_id.set(tokenId, metadata);
  state.all_token_ids.push(tokenId);
  internalAddTokenToOwner(ownerId, tokenId);
  mintEvent(ownerId, tokenId);
}
