import { near } from "near-sdk-as";

/** NEP-297 event helpers, kept in their own module like the tutorial. */
export function mintEvent(ownerId: string, tokenId: string): void {
  near.log("EVENT_JSON:{\"standard\":\"nep171\",\"version\":\"1.0.0\",\"event\":\"nft_mint\",\"data\":[{\"owner_id\":\"" + ownerId + "\",\"token_ids\":[\"" + tokenId + "\"]}]}");
}

export function transferEvent(
  oldOwnerId: string,
  newOwnerId: string,
  tokenId: string,
  authorizedId: string = "",
  memo: string = "",
): void {
  let data = "{\"old_owner_id\":\"" + oldOwnerId + "\",\"new_owner_id\":\"" + newOwnerId + "\",\"token_ids\":[\"" + tokenId + "\"]";
  if (authorizedId.length > 0) data = "{\"authorized_id\":\"" + authorizedId + "\"," + data.substring(1);
  if (memo.length > 0) data += ",\"memo\":\"" + memo + "\"";
  near.log("EVENT_JSON:{\"standard\":\"nep171\",\"version\":\"1.0.0\",\"event\":\"nft_transfer\",\"data\":[" + data + "]}");
}
