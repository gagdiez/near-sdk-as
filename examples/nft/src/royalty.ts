import { JSON, NearToken } from "near-sdk-as";

/**
 * Kept to mirror the tutorial layout. The upstream tutorial leaves payout
 * methods as exercises, so this example deliberately does not expose them.
 */
@json
export class Payout {
  payout: JSON.Obj = new JSON.Obj();
}
