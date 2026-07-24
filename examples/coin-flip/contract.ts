import { near } from "near-sdk-as";

@json
export class PlayerPoints {
  account_id: string = "";
  points: u8 = 0;

  constructor(account_id: string = "", points: u8 = 0) {
    this.account_id = account_id;
    this.points = points;
  }
}

@contract_state
export class State {
  players: PlayerPoints[] = [];
}

function playerIndex(accountId: string): i32 {
  for (let index = 0; index < state.players.length; index++) {
    if (state.players[index].account_id == accountId) return index;
  }
  return -1;
}

function simulateCoinFlip(): string {
  const seed = near.randomSeed();
  assert(seed.length > 0, "Random seed is empty");
  return seed[0] % 2 == 0 ? "heads" : "tails";
}

@call
export function flip_coin(player_guess: string): string {
  const player = near.predecessorAccountId();
  near.log(player + " chose " + player_guess);

  const outcome = simulateCoinFlip();
  const index = playerIndex(player);
  let points: u8 = index < 0 ? 0 : state.players[index].points;
  if (outcome == player_guess) points += 1;
  else if (points > 0) points -= 1;

  near.log("player_points: " + points.toString());
  if (index < 0) state.players.push(new PlayerPoints(player, points));
  else state.players[index].points = points;
  return outcome;
}

@view
export function points_of(player: string): u8 {
  const index = playerIndex(player);
  const points: u8 = index < 0 ? 0 : state.players[index].points;
  near.log("Points for " + player + ": " + points.toString());
  return points;
}
