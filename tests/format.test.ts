import { describe, expect, it } from "vitest";
import { EXPERIMENTS, computeResults } from "@/lib/experiments";
import { aed, evidenceLabel, pct, plainReason } from "@/lib/format";

describe("presentation helpers", () => {
  it("evidence labels follow the p-value bands", () => {
    expect(evidenceLabel(0.012).label).toBe("Strong evidence");
    expect(evidenceLabel(0.05).label).toBe("Promising, needs more data");
    expect(evidenceLabel(0.2).label).toBe("Promising, needs more data");
    expect(evidenceLabel(0.41).label).toBe("Not enough evidence yet");
  });
  it("formats AED and percentages consistently", () => {
    expect(aed(2200)).toBe("AED 2,200");
    expect(aed(-375)).toBe("−AED 375");
    expect(pct(73.3333)).toBe("73.3%");
    expect(pct(5)).toBe("5.0%");
  });
  it("hero comparison values come from experiment 1's preset", () => {
    const r = computeResults(EXPERIMENTS[0].preset, false);
    expect(pct(r.attributedCostPct!)).toBe("6.7%");
    expect(pct(r.costToServePct!)).toBe("73.3%");
  });
  it("gives a one-sentence reason for each preset verdict", () => {
    for (const e of EXPERIMENTS) {
      const s = plainReason(computeResults(e.preset, e.hasOptOut), e.preset);
      expect(s.length).toBeGreaterThan(20);
      expect(s).not.toMatch(/NaN|undefined/);
    }
  });
});
