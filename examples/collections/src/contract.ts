import { AccountId } from "near-sdk-as/account-id";
import * as collections from "near-sdk-as";

@json
export class Metadata {
  title: string;

  constructor(title: string = "") { this.title = title; }
}

@json
export class Profile {
  account_id: AccountId | null;
  metadata: Metadata;

  constructor(account_id: AccountId | null = null, metadata: Metadata = new Metadata()) {
    this.account_id = account_id;
    this.metadata = metadata;
  }
}

@json
export class Snapshot {
  lookup: u32;
  map_keys: string[];
  set_values: string[];
  vector_values: string[];
  deferred: string;
  option: string;
  profile: Profile;

  constructor(lookup: u32 = 0, map_keys: string[] = [], set_values: string[] = [], vector_values: string[] = [], deferred: string = "", option: string = "", profile: Profile = new Profile()) {
    this.lookup = lookup;
    this.map_keys = map_keys;
    this.set_values = set_values;
    this.vector_values = vector_values;
    this.deferred = deferred;
    this.option = option;
    this.profile = profile;
  }
}

@contract_state
export class State {
  lookup: collections.LookupMap<string, u32> = new collections.LookupMap<string, u32>();
  profiles: collections.LookupMap<string, Profile> = new collections.LookupMap<string, Profile>();
  map: collections.IterableMap<string, string> = new collections.IterableMap<string, string>();
  lookup_set: collections.LookupSet<string> = new collections.LookupSet<string>();
  set: collections.IterableSet<string> = new collections.IterableSet<string>();
  vector: collections.Vector<string> = new collections.Vector<string>();
  deferred: collections.Deferred<string> = new collections.Deferred<string>();
  option: collections.LazyOption<string> = new collections.LazyOption<string>();
}

@call
export function seed(): void {
  const profile = new Profile();
  profile.account_id = AccountId.fromString("alice");
  profile.metadata.title = "Nested value";

  state.lookup.set("one", 1);
  state.profiles.set("alice", profile);
  state.map.set("alice", "A");
  state.map.set("bob", "B");
  state.lookup_set.add("hidden");
  state.set.add("first");
  state.set.add("second");
  state.vector.push("one");
  state.vector.push("two");
  state.deferred.set("loaded on demand");
  state.option.set("optional");
}

@call
export function mutate(): void {
  state.map.delete("alice");
  state.set.delete("first");
  state.vector.swapRemove(0);
  state.option.clear();
}

@view
export function snapshot(): Snapshot {
  const result = new Snapshot();
  result.lookup = state.lookup.getSome("one");
  result.map_keys = state.map.keys();
  result.set_values = state.set.values();
  result.vector_values = state.vector.values();
  result.deferred = state.deferred.get();
  result.option = state.option.get("");
  result.profile = state.profiles.getSome("alice");
  return result;
}
