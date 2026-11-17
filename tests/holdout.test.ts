import { describe, expect, it } from "vitest";
import { fnv1a, isInHoldout } from "@/lib/holdout";
import type { Lead } from "@/lib/types";
import leads from "@/data/leads.json";

describe("holdout", () => {
  it("FNV-1a matches reference vectors", () => {
    expect(fnv1a("")).toBe(0x811c9dc5);
    expect(fnv1a("a")).toBe(0xe40c292c);
    expect(fnv1a("foobar")).toBe(0xbf9cf968);
  });

  it("is deterministic", () => {
    const first = (leads as Lead[]).map(isInHoldout);
    for (let i = 0; i < 5; i++) expect((leads as Lead[]).map(isInHoldout)).toEqual(first);
  });

  it("assigns ≈20% of eligible leads over a large id space", () => {
    const n = 20000;
    let h = 0;
    for (let i = 1; i <= n; i++) {
      if (isInHoldout({ id: `L-${String(i).padStart(5, "0")}`, lead_source: "checkout_dropoff" })) h++;
    }
    expect(h / n).toBeGreaterThan(0.18);
    expect(h / n).toBeLessThan(0.22);
  });

  it("never holds out callback requests", () => {
    for (let i = 1; i <= 2000; i++) {
      expect(isInHoldout({ id: `L-${i}`, lead_source: "call_me_back" })).toBe(false);
    }
    for (const l of leads as Lead[]) {
      if (l.lead_source === "call_me_back") expect(isInHoldout(l)).toBe(false);
    }
  });

  it("depends only on id and source", () => {
    const l = (leads as Lead[]).find((x) => x.lead_source !== "call_me_back")!;
    const variants = [{ ...l, basket_value_aed: 9999 }, { ...l, past_bookings: 0 }, { ...l, hours_since_dropoff: 0.5 }];
    for (const v of variants) expect(isInHoldout(v)).toBe(isInHoldout(l));
  });
});
