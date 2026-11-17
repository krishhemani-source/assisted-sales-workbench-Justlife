import { describe, expect, it } from "vitest";
import { EXPERIMENTS, computeResults, computeCostPerLead, toRaw, validateInputs, type ExperimentInputs } from "@/lib/experiments";
import { normalCdf, normalInv, sampleSizePerArm, twoProportionZTest } from "@/lib/stats";

const byId = (id: string) => EXPERIMENTS.find((e) => e.id === id)!;
const run = (id: string, patch: Partial<ExperimentInputs> = {}) => {
  const e = byId(id);
  return computeResults({ ...e.preset, ...patch }, e.hasOptOut);
};

describe("stats", () => {
  it("normal CDF / inverse", () => {
    expect(normalCdf(0)).toBeCloseTo(0.5, 6);
    expect(normalCdf(1.959964)).toBeCloseTo(0.975, 5);
    expect(normalInv(0.975)).toBeCloseTo(1.959964, 4);
    expect(normalInv(0.8)).toBeCloseTo(0.841621, 4);
  });
  it("two-proportion z-test (pooled, two-sided)", () => {
    const r = twoProportionZTest(0.45, 300, 0.35, 300);
    expect(r.z).toBeCloseTo(2.5, 6);
    expect(r.pValue).toBeCloseTo(0.0124, 3);
    expect(twoProportionZTest(0.3, 100, 0.3, 100).pValue).toBeCloseTo(1, 6);
    expect(twoProportionZTest(0, 100, 0, 100)).toEqual({ z: 0, pValue: 1 });
  });
  it("sample size per arm", () => {
    // Textbook: 30% vs 33% ≈ 3,760 per arm.
    const n = sampleSizePerArm(0.33, 0.3)!;
    expect(n).toBeGreaterThan(3600);
    expect(n).toBeLessThan(3900);
    expect(sampleSizePerArm(0.3, 0.3)).toBeNull();
  });
});

describe("experiment formulas", () => {
  it("cost per lead", () => {
    expect(computeCostPerLead(1, 1, 5, 0.5)).toBe(5.5);
    expect(computeCostPerLead(0.9, 1, 5, 0.5)).toBeCloseTo(5.0, 10);
  });

  it("preset 1 → KILL, cost to serve ≈ 73%", () => {
    const r = run("checkout-recovery");
    expect(r.incrementalBookings).toBeCloseTo(12, 10);
    expect(r.incrementalGmv).toBeCloseTo(3000, 6);
    expect(r.incrementalCost).toBeCloseTo(2200, 6);
    expect(r.costToServePct).toBeCloseTo(73.33, 1);
    expect(r.attributedCostPct).toBeCloseTo((400 * 5.5) / (132 * 250) * 100, 6);
    expect(r.verdict).toBe("KILL");
    expect(byId("checkout-recovery").expectedVerdict).toBe("KILL");
  });

  it("preset 2 → SCALE, cost to serve ≈ 4%, significant", () => {
    const r = run("callback-priority");
    expect(r.incrementalBookings).toBeCloseTo(30, 10);
    expect(r.incrementalGmv).toBeCloseTo(10500, 6);
    expect(r.incrementalCost).toBeCloseTo(450, 6);
    expect(r.costToServePct).toBeCloseTo(4.29, 1);
    expect(r.costPerIncrementalBooking).toBeCloseTo(15, 6);
    expect(r.significant).toBe(true);
    expect(r.verdict).toBe("SCALE");
  });

  it("preset 3 → ITERATE, net cost saving, not significant", () => {
    const r = run("whatsapp-first");
    expect(r.incrementalBookings).toBeCloseTo(7.5, 10);
    expect(r.incrementalCost).toBeCloseTo(-375, 6);
    expect(r.costStatus).toBe("net_saving");
    expect(r.costToServePct).toBeNull();
    expect(r.guardrails.find((g) => g.key === "cost")!.status).toBe("pass");
    expect(r.significant).toBe(false);
    expect(r.verdict).toBe("ITERATE");
  });

  it("every preset produces its expected verdict", () => {
    for (const e of EXPERIMENTS) expect(computeResults(e.preset, e.hasOptOut).verdict).toBe(e.expectedVerdict);
  });

  it("no incremental GMV → no percentage, KILL", () => {
    const r = run("callback-priority", { treatmentRatePct: 30, controlRatePct: 35 });
    expect(r.costStatus).toBe("no_gmv");
    expect(r.costToServePct).toBeNull();
    expect(r.verdict).toBe("KILL");
  });

  it("cost to serve 10-15% → ITERATE even when significant", () => {
    // 45/35, AOV 350, N 300: GMV 10,500. Need incremental cost ~1,260 (12%): CPL diff 4.2.
    const r = run("callback-priority", { callsT: 2.04, callsC: 1.2 });
    expect(r.costToServePct!).toBeGreaterThan(10);
    expect(r.costToServePct!).toBeLessThan(15);
    expect(r.significant).toBe(true);
    expect(r.verdict).toBe("ITERATE");
  });

  it("guardrail breaches → KILL", () => {
    expect(run("callback-priority", { appConvTreatmentPct: 28 }).verdict).toBe("KILL"); // 6.7% drop
    expect(run("callback-priority", { quality: 3.9 }).verdict).toBe("KILL");
    expect(run("whatsapp-first", { optOutPct: 2.5 }).verdict).toBe("KILL");
    // Opt-out guardrail does not apply to experiments without it.
    expect(run("callback-priority", { optOutPct: 50 }).verdict).toBe("SCALE");
  });
});

describe("validation", () => {
  const raw = toRaw(byId("checkout-recovery").preset);
  it("accepts presets", () => {
    for (const e of EXPERIMENTS) expect(validateInputs(toRaw(e.preset), e.hasOptOut).ok).toBe(true);
  });
  it("rejects invalid input and never returns values", () => {
    const cases: [keyof typeof raw, string][] = [
      ["treatmentRatePct", "120"],
      ["controlRatePct", "-1"],
      ["treatmentN", "0"],
      ["controlN", "10.5"],
      ["costPerCall", "-2"],
      ["aov", ""],
      ["aov", "abc"],
      ["quality", "6"],
    ];
    for (const [k, v] of cases) {
      const r = validateInputs({ ...raw, [k]: v }, false);
      expect(r.ok).toBe(false);
      expect(r.values).toBeNull();
      expect(r.errors[k]).toBeTruthy();
    }
  });
  it("results are always finite for valid inputs", () => {
    const r = computeResults({ ...byId("checkout-recovery").preset, treatmentRatePct: 0, controlRatePct: 0, appConvHoldoutPct: 0 }, false);
    for (const v of [r.incrementalBookings, r.incrementalGmv, r.incrementalCost, r.pValue, r.z, r.appConvRelativeDropPct]) {
      expect(Number.isFinite(v)).toBe(true);
    }
  });
});
