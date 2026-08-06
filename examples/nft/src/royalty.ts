import { JSON } from "near-sdk-as";
import { NearToken } from "near-sdk-as/near-token";

/**
 * Kept to mirror the tutorial layout. The upstream tutorial leaves payout
 * methods as exercises, so this example deliberately does not expose them.
 */
@json
export class Payout {
  payout: JSON.Obj;

  constructor(payout: JSON.Obj = new JSON.Obj()) { this.payout = payout; }
}
