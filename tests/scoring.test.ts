import { describe, expect, it } from "vitest";
import { scoreLead, weightsFromIntentPct, OVERRIDE_LABEL, validThresholds } from "@/lib/scoring";
import { DEFAULT_THRESHOLDS, DEFAULT_WEIGHTS } from "@/lib/config";
import type { Lead } from "@/lib/types";
import leads from "@/data/leads.json";

const base: Lead = {
  id: "T-1",
  lead_source: "checkout_dropoff",
  service: "home_cleaning",
  drop_off_step: "payment",
  basket_value_aed: 180,
  hours_since_dropoff: 1,
  past_bookings: 5,
  city: "Dubai",
};

describe("scoring", () => {
  it("repeat home cleaning customer at payment → LEAVE TO APP", () => {
    const s = scoreLead(base);
    expect(s.intent.total).toBe(90);
    expect(s.appFailure.total).toBe(14);
    expect(s.opportunity).toBeCloseTo(40.6, 1);
    expect(s.action).toBe("LEAVE_TO_APP");
    expect(s.reason).toMatch(/Repeat customer \(5 bookings\).*self-serve/);
  });

  it("first-time packing & moving stalled at pricing → AGENT CALL", () => {
    const s = scoreLead({
      ...base,
      lead_source: "browse_abandon",
      service: "packing_moving",
      drop_off_step: "pricing",
      hours_since_dropoff: 30,
      basket_value_aed: 2400,
      past_bookings: 0,
    });
    expect(s.intent.total).toBe(40);
    expect(s.appFailure.total).toBe(100);
    expect(s.opportunity).toBeCloseTo(79, 1);
    expect(s.action).toBe("AGENT_CALL");
    expect(s.override).toBe(false);
    expect(s.reason).toBe(
      "First-time customer stalled at pricing on a AED 2,400 move; app unlikely to close alone.",
    );
  });

  it("callback request is always AGENT CALL via override, even with a low score", () => {
    const lowest: Lead = {
      ...base,
      lead_source: "call_me_back",
      hours_since_dropoff: 110,
      drop_off_step: "payment",
      past_bookings: 12,
    };
    const s = scoreLead(lowest, weightsFromIntentPct(0), { agentCall: 100, whatsapp: 100 });
    expect(s.action).toBe("AGENT_CALL");
    expect(s.override).toBe(true);
    expect(OVERRIDE_LABEL).toMatch(/explicitly requested a callback/);
    for (const l of leads as Lead[]) {
      if (l.lead_source === "call_me_back") expect(scoreLead(l).action).toBe("AGENT_CALL");
    }
  });

  it("weights always sum to 1", () => {
    for (let p = -10; p <= 110; p += 0.5) {
      const w = weightsFromIntentPct(p);
      expect(w.intent + w.appFailure).toBeCloseTo(1, 12);
      expect(w.intent).toBeGreaterThanOrEqual(0);
      expect(w.appFailure).toBeGreaterThanOrEqual(0);
    }
    expect(weightsFromIntentPct(NaN).intent + weightsFromIntentPct(NaN).appFailure).toBe(1);
    expect(DEFAULT_WEIGHTS.intent + DEFAULT_WEIGHTS.appFailure).toBeCloseTo(1, 12);
  });

  it("all scores stay within 0-100 across weights and every lead", () => {
    for (const l of leads as Lead[]) {
      for (let p = 0; p <= 100; p += 5) {
        const s = scoreLead(l, weightsFromIntentPct(p), DEFAULT_THRESHOLDS);
        for (const v of [s.intent.total, s.appFailure.total, s.opportunity]) {
          expect(v).toBeGreaterThanOrEqual(0);
          expect(v).toBeLessThanOrEqual(100);
        }
      }
    }
  });

  it("changing weights re-ranks leads", () => {
    const rank = (p: number) =>
      (leads as Lead[])
        .map((l) => ({ id: l.id, o: scoreLead(l, weightsFromIntentPct(p)).opportunity }))
        .sort((a, b) => b.o - a.o)
        .map((x) => x.id)
        .join();
    expect(rank(35)).not.toBe(rank(80));
  });

  it("threshold validation", () => {
    expect(validThresholds(DEFAULT_THRESHOLDS)).toBe(true);
    expect(validThresholds({ agentCall: 40, whatsapp: 50 })).toBe(false);
    expect(validThresholds({ agentCall: NaN, whatsapp: 50 })).toBe(false);
  });
});
