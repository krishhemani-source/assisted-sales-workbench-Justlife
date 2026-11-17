import { GUARDRAIL_DEFAULTS, VERDICT } from "./config";
import { sampleSizePerArm, twoProportionZTest } from "./stats";

/* ------------------------------------------------------------------ */
/* Inputs                                                              */
/* ------------------------------------------------------------------ */

export interface ExperimentInputs {
  treatmentN: number;
  controlN: number;
  /** Booking rate per ASSIGNED lead (%), including leads never connected. */
  treatmentRatePct: number;
  controlRatePct: number;
  /** Informational; the primary metric for experiment 3 only. */
  connectionRatePct: number;
  aov: number;
  callsT: number;
  callsC: number;
  waT: number;
  waC: number;
  costPerCall: number;
  costPerWa: number;
  appConvHoldoutPct: number;
  appConvTreatmentPct: number;
  maxAppDropPct: number;
  quality: number;
  qualityThreshold: number;
  optOutPct: number;
  maxOptOutPct: number;
}

export type InputKey = keyof ExperimentInputs;
export type RawInputs = Record<InputKey, string>;

type Kind = "count" | "pct" | "money" | "perLead" | "quality";

export interface FieldSpec {
  key: InputKey;
  label: string;
  kind: Kind;
  unit?: string;
  hint?: string;
  /** Only shown/validated for experiments with an opt-out guardrail. */
  optOutOnly?: boolean;
}

export const FIELD_GROUPS: { title: string; fields: FieldSpec[] }[] = [
  {
    title: "Sample & outcome",
    fields: [
      { key: "treatmentN", label: "Treatment N", kind: "count" },
      { key: "controlN", label: "Control N", kind: "count" },
      { key: "treatmentRatePct", label: "Booking rate, treatment", kind: "pct", unit: "%", hint: "per assigned lead" },
      { key: "controlRatePct", label: "Booking rate, control", kind: "pct", unit: "%", hint: "per assigned lead" },
      { key: "connectionRatePct", label: "Connection rate", kind: "pct", unit: "%", hint: "informational" },
      { key: "aov", label: "Average order value", kind: "money", unit: "AED" },
    ],
  },
  {
    title: "Contact effort & unit cost",
    fields: [
      { key: "callsT", label: "Calls / lead (treatment)", kind: "perLead" },
      { key: "callsC", label: "Calls / lead (control)", kind: "perLead" },
      { key: "waT", label: "WhatsApp / lead (treatment)", kind: "perLead" },
      { key: "waC", label: "WhatsApp / lead (control)", kind: "perLead" },
      { key: "costPerCall", label: "Cost per call attempt", kind: "money", unit: "AED" },
      { key: "costPerWa", label: "Cost per WhatsApp conversation", kind: "money", unit: "AED" },
    ],
  },
  {
    title: "Guardrails",
    fields: [
      { key: "appConvHoldoutPct", label: "App conversion: holdout baseline", kind: "pct", unit: "%" },
      { key: "appConvTreatmentPct", label: "App conversion: treatment cohort", kind: "pct", unit: "%" },
      { key: "maxAppDropPct", label: "Max allowed relative drop", kind: "pct", unit: "%" },
      { key: "quality", label: "Interaction quality (simulated)", kind: "quality", unit: "/ 5" },
      { key: "qualityThreshold", label: "Quality threshold", kind: "quality", unit: "/ 5" },
      { key: "optOutPct", label: "Opt-out / complaint rate", kind: "pct", unit: "%", optOutOnly: true },
      { key: "maxOptOutPct", label: "Max opt-out / complaint rate", kind: "pct", unit: "%", optOutOnly: true },
    ],
  },
];

const ALL_FIELDS = FIELD_GROUPS.flatMap((g) => g.fields);

export function toRaw(inputs: ExperimentInputs): RawInputs {
  const out = {} as RawInputs;
  for (const f of ALL_FIELDS) out[f.key] = String(inputs[f.key]);
  return out;
}

export type ValidationResult =
  | { ok: true; values: ExperimentInputs; errors: Partial<Record<InputKey, string>> }
  | { ok: false; values: null; errors: Partial<Record<InputKey, string>> };

/** Strict parsing. Never returns values when any visible field is invalid. */
export function validateInputs(raw: RawInputs, hasOptOut: boolean): ValidationResult {
  const errors: Partial<Record<InputKey, string>> = {};
  const values = {} as ExperimentInputs;
  for (const f of ALL_FIELDS) {
    if (f.optOutOnly && !hasOptOut) {
      values[f.key] = 0;
      continue;
    }
    const s = (raw[f.key] ?? "").trim();
    const n = s === "" ? NaN : Number(s);
    if (!Number.isFinite(n)) {
      errors[f.key] = "Enter a number";
      continue;
    }
    switch (f.kind) {
      case "count":
        if (!Number.isInteger(n) || n < 1) errors[f.key] = "Positive whole number";
        break;
      case "pct":
        if (n < 0 || n > 100) errors[f.key] = "Between 0 and 100";
        break;
      case "money":
        if (f.key === "aov" ? n <= 0 : n < 0) errors[f.key] = f.key === "aov" ? "Must be above 0" : "Cannot be negative";
        break;
      case "perLead":
        if (n < 0) errors[f.key] = "Cannot be negative";
        break;
      case "quality":
        if (n < 0 || n > 5) errors[f.key] = "Between 0 and 5";
        break;
    }
    values[f.key] = n;
  }
  if (Object.keys(errors).length > 0) return { ok: false, values: null, errors };
  return { ok: true, values, errors };
}

/* ------------------------------------------------------------------ */
/* Results                                                             */
/* ------------------------------------------------------------------ */

export type Verdict = "SCALE" | "ITERATE" | "KILL";
export type GuardrailStatus = "pass" | "warn" | "fail";
export type CostStatus = "pct" | "no_gmv" | "net_saving";

export interface Guardrail {
  key: "cost" | "app" | "quality" | "optout";
  label: string;
  status: GuardrailStatus;
  detail: string;
}

export interface ExperimentResults {
  treatmentBookings: number;
  incrementalBookings: number;
  /** Share of treatment bookings that are incremental. */
  incrementalShare: number | null;
  incrementalGmv: number;
  costPerLeadT: number;
  costPerLeadC: number;
  incrementalCost: number;
  costStatus: CostStatus;
  costToServePct: number | null;
  costPerIncrementalBooking: number | null;
  /** Total treatment cost / total treatment GMV ("attributed basis, less strict"). */
  attributedCostPct: number | null;
  appConvRelativeDropPct: number;
  z: number;
  pValue: number;
  significant: boolean;
  sampleNeededPerArm: number | null;
  guardrails: Guardrail[];
  verdict: Verdict;
  headline: string;
  reasons: string[];
}

const fmt = (n: number, d = 1) => n.toLocaleString("en-US", { maximumFractionDigits: d, minimumFractionDigits: 0 });
const aed = (n: number) => `AED ${Math.round(n).toLocaleString("en-US")}`;

export function computeCostPerLead(calls: number, whatsapps: number, costPerCall: number, costPerWa: number): number {
  return calls * costPerCall + whatsapps * costPerWa;
}

export function computeResults(x: ExperimentInputs, hasOptOut: boolean): ExperimentResults {
  const pT = x.treatmentRatePct / 100;
  const pC = x.controlRatePct / 100;

  // Core incrementality maths.
  const treatmentBookings = x.treatmentN * pT;
  const incrementalBookings = x.treatmentN * (pT - pC);
  const incrementalGmv = incrementalBookings * x.aov;
  const costPerLeadT = computeCostPerLead(x.callsT, x.waT, x.costPerCall, x.costPerWa);
  const costPerLeadC = computeCostPerLead(x.callsC, x.waC, x.costPerCall, x.costPerWa);
  const incrementalCost = x.treatmentN * (costPerLeadT - costPerLeadC);

  let costStatus: CostStatus;
  let costToServePct: number | null = null;
  if (incrementalGmv <= 0) costStatus = "no_gmv";
  else if (incrementalCost <= 0) costStatus = "net_saving";
  else {
    costStatus = "pct";
    costToServePct = (incrementalCost / incrementalGmv) * 100;
  }

  const treatmentGmv = treatmentBookings * x.aov;
  const attributedCostPct = treatmentGmv > 0 ? ((x.treatmentN * costPerLeadT) / treatmentGmv) * 100 : null;
  const costPerIncrementalBooking = incrementalBookings > 0 ? incrementalCost / incrementalBookings : null;
  const incrementalShare = treatmentBookings > 0 ? incrementalBookings / treatmentBookings : null;

  // Significance (approximate).
  const { z, pValue } = twoProportionZTest(pT, x.treatmentN, pC, x.controlN);
  const significant = pValue < VERDICT.alpha;
  const sampleNeededPerArm = sampleSizePerArm(pT, pC, VERDICT.alpha, VERDICT.power);

  // Guardrails.
  const appConvRelativeDropPct =
    x.appConvHoldoutPct > 0 ? ((x.appConvHoldoutPct - x.appConvTreatmentPct) / x.appConvHoldoutPct) * 100 : 0;

  const guardrails: Guardrail[] = [];
  if (costStatus === "no_gmv") {
    guardrails.push({ key: "cost", label: "Cost to serve", status: "fail", detail: "No incremental GMV · uneconomic" });
  } else if (costStatus === "net_saving") {
    guardrails.push({ key: "cost", label: "Cost to serve", status: "pass", detail: "Net cost saving vs control" });
  } else {
    const c = costToServePct as number;
    guardrails.push({
      key: "cost",
      label: "Cost to serve",
      status: c > VERDICT.killMaxCostToServePct ? "fail" : c > VERDICT.scaleMaxCostToServePct ? "warn" : "pass",
      detail: `${fmt(c)}% (scale ≤ ${VERDICT.scaleMaxCostToServePct}%, kill > ${VERDICT.killMaxCostToServePct}%)`,
    });
  }
  guardrails.push({
    key: "app",
    label: "App conversion (vs holdout)",
    status: appConvRelativeDropPct > x.maxAppDropPct ? "fail" : "pass",
    detail:
      appConvRelativeDropPct > 0
        ? `${fmt(appConvRelativeDropPct)}% relative drop (max ${fmt(x.maxAppDropPct)}%)`
        : `No drop (max ${fmt(x.maxAppDropPct)}%)`,
  });
  guardrails.push({
    key: "quality",
    label: "Interaction quality",
    status: x.quality < x.qualityThreshold ? "fail" : "pass",
    detail: `${fmt(x.quality, 2)} / 5 (min ${fmt(x.qualityThreshold, 2)})`,
  });
  if (hasOptOut) {
    guardrails.push({
      key: "optout",
      label: "Opt-outs / complaints",
      status: x.optOutPct > x.maxOptOutPct ? "fail" : "pass",
      detail: `${fmt(x.optOutPct, 2)}% (max ${fmt(x.maxOptOutPct, 2)}%)`,
    });
  }

  // Verdict.
  const reasons: string[] = [];
  const failed = guardrails.filter((g) => g.status === "fail");
  let verdict: Verdict;
  let headline: string;

  if (failed.length > 0) {
    verdict = "KILL";
    for (const g of failed) {
      if (g.key === "cost" && costStatus === "no_gmv") {
        reasons.push(
          `Treatment does not beat control (${fmt(x.treatmentRatePct)}% vs ${fmt(x.controlRatePct)}%), so there is no incremental GMV to pay for the contact cost.`,
        );
      } else if (g.key === "cost") {
        const share = incrementalShare !== null ? ` Only ${fmt(incrementalShare * 100, 0)}% of treatment bookings are incremental; most of these customers would have booked anyway.` : "";
        reasons.push(
          `Cost to serve is ${fmt(costToServePct as number)}%, above the ${VERDICT.killMaxCostToServePct}% ceiling: ${aed(incrementalCost)} of contact cost buys ${aed(incrementalGmv)} of incremental GMV.${share}`,
        );
      } else if (g.key === "app") {
        reasons.push(`App conversion fell ${fmt(appConvRelativeDropPct)}% relative to holdout, beyond the ${fmt(x.maxAppDropPct)}% limit: the channel may be cannibalising self-serve.`);
      } else if (g.key === "quality") {
        reasons.push(`Interaction quality ${fmt(x.quality, 2)} is below the ${fmt(x.qualityThreshold, 2)} threshold.`);
      } else if (g.key === "optout") {
        reasons.push(`Opt-outs/complaints at ${fmt(x.optOutPct, 2)}% exceed the ${fmt(x.maxOptOutPct, 2)}% maximum.`);
      }
    }
    headline = "Stop: a guardrail is breached.";
  } else {
    const economicForScale = costStatus === "net_saving" || (costToServePct as number) <= VERDICT.scaleMaxCostToServePct;
    if (significant && economicForScale) {
      verdict = "SCALE";
      headline = "Scale: incremental, significant and economic.";
      reasons.push(
        `${fmt(incrementalBookings, 1)} incremental bookings (${aed(incrementalGmv)} GMV) with p = ${pValue.toFixed(3)}.`,
      );
      reasons.push(
        costStatus === "net_saving"
          ? "Treatment costs less per lead than control: a net saving."
          : `Cost to serve ${fmt(costToServePct as number)}% is within the ${VERDICT.scaleMaxCostToServePct}% target${costPerIncrementalBooking !== null ? ` (${aed(costPerIncrementalBooking)} per incremental booking)` : ""}.`,
      );
      reasons.push("All guardrails pass.");
    } else {
      verdict = "ITERATE";
      headline = "Iterate: promising, not yet proven.";
      if (!significant) {
        const need = sampleNeededPerArm !== null ? ` Roughly ${sampleNeededPerArm.toLocaleString("en-US")} leads per arm would be needed to detect this lift.` : "";
        reasons.push(
          `Lift of ${fmt(x.treatmentRatePct - x.controlRatePct)} pts is positive but not significant (p = ${pValue.toFixed(2)}).${need}`,
        );
      }
      if (costStatus === "pct" && (costToServePct as number) > VERDICT.scaleMaxCostToServePct) {
        reasons.push(
          `Cost to serve ${fmt(costToServePct as number)}% sits between ${VERDICT.scaleMaxCostToServePct}% and ${VERDICT.killMaxCostToServePct}%: try a cheaper channel or fewer attempts.`,
        );
      }
      if (costStatus === "net_saving") reasons.push("Treatment is cheaper per lead than control, so economics already work.");
      reasons.push("No guardrail is breached.");
    }
  }

  return {
    treatmentBookings,
    incrementalBookings,
    incrementalShare,
    incrementalGmv,
    costPerLeadT,
    costPerLeadC,
    incrementalCost,
    costStatus,
    costToServePct,
    costPerIncrementalBooking,
    attributedCostPct,
    appConvRelativeDropPct,
    z,
    pValue,
    significant,
    sampleNeededPerArm,
    guardrails,
    verdict,
    headline,
    reasons,
  };
}

/* ------------------------------------------------------------------ */
/* Presets                                                             */
/* ------------------------------------------------------------------ */

export interface ExperimentDefinition {
  id: string;
  number: number;
  title: string;
  treatment: string;
  control: string;
  primaryMetric: string;
  guardrailNote: string;
  hasOptOut: boolean;
  highlightConnection: boolean;
  highlightCostPerIncBooking: boolean;
  expectedVerdict: Verdict;
  preset: ExperimentInputs;
}

const COMMON = {
  costPerCall: 5,
  costPerWa: 0.5,
  maxAppDropPct: GUARDRAIL_DEFAULTS.maxAppConversionRelativeDropPct,
  qualityThreshold: GUARDRAIL_DEFAULTS.qualityThreshold,
  maxOptOutPct: GUARDRAIL_DEFAULTS.maxOptOutPct,
  optOutPct: 0,
};

export const EXPERIMENTS: ExperimentDefinition[] = [
  {
    id: "checkout-recovery",
    number: 1,
    title: "Checkout recovery: is high intent incremental?",
    treatment: "Agent call within 2h of checkout drop-off, then WhatsApp.",
    control: "Existing app journey (no human contact).",
    primaryMetric: "Incremental delivered GMV",
    guardrailNote: "App conversion, cost to serve, quality",
    hasOptOut: false,
    highlightConnection: false,
    highlightCostPerIncBooking: false,
    expectedVerdict: "KILL",
    preset: {
      ...COMMON,
      treatmentN: 400,
      controlN: 400,
      treatmentRatePct: 33,
      controlRatePct: 30,
      connectionRatePct: 60,
      aov: 250,
      callsT: 1.0,
      callsC: 0,
      waT: 1.0,
      waC: 0,
      appConvHoldoutPct: 30,
      appConvTreatmentPct: 29.5,
      quality: 4.3,
    },
  },
  {
    id: "callback-priority",
    number: 2,
    title: "Callback prioritisation",
    treatment: "Respond to callback requests within 15 minutes.",
    control: "Existing callback process.",
    primaryMetric: "Booking conversion and GMV per lead",
    guardrailNote: "Cost per incremental booking",
    hasOptOut: false,
    highlightConnection: false,
    highlightCostPerIncBooking: true,
    expectedVerdict: "SCALE",
    preset: {
      ...COMMON,
      treatmentN: 300,
      controlN: 300,
      treatmentRatePct: 45,
      controlRatePct: 35,
      connectionRatePct: 75,
      aov: 350,
      callsT: 1.5,
      callsC: 1.2,
      waT: 0,
      waC: 0,
      appConvHoldoutPct: 30,
      appConvTreatmentPct: 30,
      quality: 4.4,
    },
  },
  {
    id: "whatsapp-first",
    number: 3,
    title: "WhatsApp before calling",
    treatment: "Contextual WhatsApp first, then a call if no reply.",
    control: "Call-first.",
    primaryMetric: "Connection and booking rates",
    guardrailNote: "Opt-outs / complaints, cost to serve",
    hasOptOut: true,
    highlightConnection: true,
    highlightCostPerIncBooking: false,
    expectedVerdict: "ITERATE",
    preset: {
      ...COMMON,
      treatmentN: 250,
      controlN: 250,
      treatmentRatePct: 23,
      controlRatePct: 20,
      connectionRatePct: 55,
      aov: 300,
      callsT: 0.9,
      callsC: 1.3,
      waT: 1.0,
      waC: 0,
      appConvHoldoutPct: 30,
      appConvTreatmentPct: 30,
      quality: 4.2,
      optOutPct: 1.2,
    },
  },
];
