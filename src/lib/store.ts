// In-memory evidence store. Uploaded photo evidence is added here and merged with the seed venues.
// It resets when the dev server restarts. That's fine for the demo; swap for SQLite/Postgres later.

import { venues as seedVenues } from "@/data/venues";
import type { FeatureValue, Venue } from "./types";

interface Store {
  added: Record<string, FeatureValue[]>;
  feedback: Record<string, { text: string; role: "host" | "visitor"; created_at: string }[]>;
}

const g = globalThis as unknown as { __accessStore?: Store };
const store: Store = (g.__accessStore ??= { added: {}, feedback: {} });

export function getVenues(): Venue[] {
  return seedVenues.map((v) => (store.added[v.id]?.length ? { ...v, features: [...v.features, ...store.added[v.id]] } : v));
}

export function getVenue(id: string): Venue | undefined {
  return getVenues().find((v) => v.id === id);
}

export function addEvidence(venueId: string, fv: FeatureValue): void {
  (store.added[venueId] ??= []).push(fv);
}

export function addedEvidence(venueId: string): FeatureValue[] {
  return store.added[venueId] ?? [];
}
