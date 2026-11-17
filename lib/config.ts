/**
 * Every tunable number in the workbench lives here.
 * Change a value here and the scoring, holdout, experiment verdicts and UI all follow.
 */

export type LeadSource = "call_me_back" | "checkout_dropoff" | "whatsapp_inbound" | "browse_abandon";
export type Service = "home_cleaning" | "deep_cleaning" | "salon_at_home" | "pest_control" | "packing_moving";
export type DropOffStep = "service_selection" | "pricing" | "scheduling" | "payment";
export type City = "Dubai" | "Abu Dhabi" | "Sharjah";

/* ------------------------------------------------------------------ */
/* Scoring: Intent (0-100)                                             */
/* ------------------------------------------------------------------ */

export const INTENT_SOURCE_POINTS: Record<LeadSource, number> = {
  call_me_back: 40,
  checkout_dropoff: 30,
  whatsapp_inbound: 25,
  browse_abandon: 10,
};

/** Recency bands, evaluated in order: first band whose maxHours >= hours wins. */
export const INTENT_RECENCY_BANDS: { maxHours: number; points: number; label: string }[] = [
  { maxHours: 2, points: 30, label: "≤ 2h" },
  { maxHours: 24, points: 20, label: "≤ 24h" },
  { maxHours: 72, points: 10, label: "≤ 72h" },
  { maxHours: Infinity, points: 0, label: "> 72h" },
];

export const INTENT_STAGE_POINTS: Record<DropOffStep, number> = {
  payment: 30,
  scheduling: 25,
  pricing: 20,
  service_selection: 10,
};

/* ------------------------------------------------------------------ */
/* Scoring: App-failure likelihood (0-100)                             */
/* ------------------------------------------------------------------ */

export const APPFAIL_COMPLEXITY_POINTS: Record<Service, number> = {
  packing_moving: 35,
  pest_control: 25,
  deep_cleaning: 25,
  salon_at_home: 10,
  home_cleaning: 5,
};

/** Basket bands, evaluated in order: first band whose minAed <= basket wins. */
export const APPFAIL_BASKET_BANDS: { minAed: number; points: number; label: string }[] = [
  { minAed: 800, points: 20, label: "≥ AED 800" },
  { minAed: 400, points: 12, label: "AED 400–799" },
  { minAed: 0, points: 4, label: "< AED 400" },
];

export const APPFAIL_STAGE_POINTS: Record<DropOffStep, number> = {
  pricing: 25,
  scheduling: 25,
  service_selection: 15,
  payment: 5,
};

/** History bands, evaluated in order: first band whose maxBookings >= past_bookings wins. */
export const APPFAIL_HISTORY_BANDS: { maxBookings: number; points: number; label: string }[] = [
  { maxBookings: 0, points: 20, label: "0 past bookings" },
  { maxBookings: 2, points: 10, label: "1–2 past bookings" },
  { maxBookings: Infinity, points: 0, label: "3+ past bookings" },
];

/* ------------------------------------------------------------------ */
/* Weights and action bands                                            */
/* ------------------------------------------------------------------ */

export const DEFAULT_WEIGHTS = { intent: 0.35, appFailure: 0.65 } as const;

export const DEFAULT_THRESHOLDS = {
  /** Opportunity >= agentCall → AGENT CALL */
  agentCall: 55,
  /** Opportunity >= whatsapp (and < agentCall) → WHATSAPP NUDGE; below → LEAVE TO APP */
  whatsapp: 42,
} as const;

/* ------------------------------------------------------------------ */
/* Lead-level holdout                                                  */
/* ------------------------------------------------------------------ */

export const HOLDOUT = {
  /** hash(lead id) mod 100 < percent → holdout */
  percent: 20,
  /** Sources never eligible for holdout (we never withhold a requested callback). */
  ineligibleSources: ["call_me_back"] as LeadSource[],
} as const;

/* ------------------------------------------------------------------ */
/* Experiment verdict thresholds                                       */
/* ------------------------------------------------------------------ */

export const VERDICT = {
  /** SCALE requires cost to serve at or below this (%). */
  scaleMaxCostToServePct: 10,
  /** KILL when cost to serve is above this (%). Between the two → ITERATE. */
  killMaxCostToServePct: 15,
  /** Significance level for the two-sided z-test. */
  alpha: 0.05,
  /** Power used for the approximate sample-size estimate. */
  power: 0.8,
} as const;

export const GUARDRAIL_DEFAULTS = {
  /** Max allowed relative drop in app conversion for the treatment cohort vs holdout baseline (%). */
  maxAppConversionRelativeDropPct: 5,
  /** Minimum simulated interaction quality (out of 5). */
  qualityThreshold: 4.0,
  /** Max opt-out / complaint rate (%), experiment 3 only. */
  maxOptOutPct: 2,
} as const;

/* ------------------------------------------------------------------ */
/* Display labels                                                      */
/* ------------------------------------------------------------------ */

export const SOURCE_LABELS: Record<LeadSource, string> = {
  call_me_back: "Callback request",
  checkout_dropoff: "Checkout drop-off",
  whatsapp_inbound: "WhatsApp inbound",
  browse_abandon: "Browse abandon",
};

export const SERVICE_LABELS: Record<Service, string> = {
  home_cleaning: "Home cleaning",
  deep_cleaning: "Deep cleaning",
  salon_at_home: "Salon at home",
  pest_control: "Pest control",
  packing_moving: "Packing & moving",
};

export const STAGE_LABELS: Record<DropOffStep, string> = {
  service_selection: "Service selection",
  pricing: "Pricing",
  scheduling: "Scheduling",
  payment: "Payment",
};
