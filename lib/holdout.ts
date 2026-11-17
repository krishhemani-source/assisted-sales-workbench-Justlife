import { HOLDOUT } from "./config";
import type { Lead } from "./types";

/** 32-bit FNV-1a hash of a UTF-8 string. Deterministic across sessions and machines. */
export function fnv1a(input: string): number {
  let hash = 0x811c9dc5;
  const bytes = new TextEncoder().encode(input);
  for (const b of bytes) {
    hash ^= b;
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export function isHoldoutEligible(lead: Pick<Lead, "lead_source">): boolean {
  return !HOLDOUT.ineligibleSources.includes(lead.lead_source);
}

/**
 * Lead-level holdout assignment. Depends ONLY on the lead id and source,
 * never on filters, sorting, weights or thresholds.
 */
export function isInHoldout(lead: Pick<Lead, "id" | "lead_source">): boolean {
  if (!isHoldoutEligible(lead)) return false;
  return fnv1a(lead.id) % 100 < HOLDOUT.percent;
}
