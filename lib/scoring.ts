import {
  APPFAIL_BASKET_BANDS,
  APPFAIL_COMPLEXITY_POINTS,
  APPFAIL_HISTORY_BANDS,
  APPFAIL_STAGE_POINTS,
  DEFAULT_THRESHOLDS,
  DEFAULT_WEIGHTS,
  INTENT_RECENCY_BANDS,
  INTENT_SOURCE_POINTS,
  INTENT_STAGE_POINTS,
  SERVICE_LABELS,
  SOURCE_LABELS,
  STAGE_LABELS,
} from "./config";
import type { Action, Lead, Thresholds, Weights } from "./types";

export interface ScoreComponent {
  factor: string;
  value: string;
  points: number;
  max: number;
}

export interface SubScore {
  total: number;
  components: ScoreComponent[];
}

export interface LeadScore {
  intent: SubScore;
  appFailure: SubScore;
  opportunity: number;
  action: Action;
  override: boolean;
  reason: string;
}

export const OVERRIDE_LABEL = "Override: customer explicitly requested a callback";

const maxOf = (rec: Record<string, number>) => Math.max(...Object.values(rec));
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

export function formatAed(n: number): string {
  return `AED ${Math.round(n).toLocaleString("en-US")}`;
}

export function formatHours(h: number): string {
  if (h < 1) return `${Math.round(h * 60)}m`;
  if (h < 48) return `${Number.isInteger(h) ? h : h.toFixed(1)}h`;
  return `${Math.round(h / 24)}d`;
}

/* ------------------------------------------------------------------ */
/* Weights                                                             */
/* ------------------------------------------------------------------ */

/** Builds a weight pair from the intent share (0-100). Always sums to exactly 1. */
export function weightsFromIntentPct(intentPct: number): Weights {
  const p = clamp(Math.round(Number.isFinite(intentPct) ? intentPct : 0), 0, 100);
  return { intent: p / 100, appFailure: (100 - p) / 100 };
}

/* ------------------------------------------------------------------ */
/* Sub-scores                                                          */
/* ------------------------------------------------------------------ */

export function intentScore(lead: Lead): SubScore {
  const recency =
    INTENT_RECENCY_BANDS.find((b) => lead.hours_since_dropoff <= b.maxHours) ??
    INTENT_RECENCY_BANDS[INTENT_RECENCY_BANDS.length - 1];
  const components: ScoreComponent[] = [
    {
      factor: "Lead source",
      value: SOURCE_LABELS[lead.lead_source],
      points: INTENT_SOURCE_POINTS[lead.lead_source],
      max: maxOf(INTENT_SOURCE_POINTS),
    },
    {
      factor: "Recency",
      value: `${formatHours(lead.hours_since_dropoff)} ago (${recency.label})`,
      points: recency.points,
      max: INTENT_RECENCY_BANDS[0].points,
    },
    {
      factor: "Funnel stage reached",
      value: STAGE_LABELS[lead.drop_off_step],
      points: INTENT_STAGE_POINTS[lead.drop_off_step],
      max: maxOf(INTENT_STAGE_POINTS),
    },
  ];
  return { total: clamp(components.reduce((s, c) => s + c.points, 0), 0, 100), components };
}

export function appFailureScore(lead: Lead): SubScore {
  const basket =
    APPFAIL_BASKET_BANDS.find((b) => lead.basket_value_aed >= b.minAed) ??
    APPFAIL_BASKET_BANDS[APPFAIL_BASKET_BANDS.length - 1];
  const history =
    APPFAIL_HISTORY_BANDS.find((b) => lead.past_bookings <= b.maxBookings) ??
    APPFAIL_HISTORY_BANDS[APPFAIL_HISTORY_BANDS.length - 1];
  const components: ScoreComponent[] = [
    {
      factor: "Service complexity",
      value: SERVICE_LABELS[lead.service],
      points: APPFAIL_COMPLEXITY_POINTS[lead.service],
      max: maxOf(APPFAIL_COMPLEXITY_POINTS),
    },
    {
      factor: "Basket value",
      value: `${formatAed(lead.basket_value_aed)} (${basket.label})`,
      points: basket.points,
      max: APPFAIL_BASKET_BANDS[0].points,
    },
    {
      factor: "Drop-off stage",
      value: STAGE_LABELS[lead.drop_off_step],
      points: APPFAIL_STAGE_POINTS[lead.drop_off_step],
      max: maxOf(APPFAIL_STAGE_POINTS),
    },
    {
      factor: "Customer history",
      value: history.label,
      points: history.points,
      max: APPFAIL_HISTORY_BANDS[0].points,
    },
  ];
  return { total: clamp(components.reduce((s, c) => s + c.points, 0), 0, 100), components };
}

/* ------------------------------------------------------------------ */
/* Action                                                              */
/* ------------------------------------------------------------------ */

export function actionForScore(opportunity: number, t: Thresholds): Action {
  if (opportunity >= t.agentCall) return "AGENT_CALL";
  if (opportunity >= t.whatsapp) return "WHATSAPP_NUDGE";
  return "LEAVE_TO_APP";
}

/** Thresholds are valid when 0 <= whatsapp <= agentCall <= 100. */
export function validThresholds(t: Thresholds): boolean {
  return (
    Number.isFinite(t.agentCall) &&
    Number.isFinite(t.whatsapp) &&
    t.whatsapp >= 0 &&
    t.agentCall <= 100 &&
    t.whatsapp <= t.agentCall
  );
}

/* ------------------------------------------------------------------ */
/* Reason line                                                         */
/* ------------------------------------------------------------------ */

const SERVICE_NOUN: Record<Lead["service"], string> = {
  home_cleaning: "home clean",
  deep_cleaning: "deep clean",
  salon_at_home: "salon booking",
  pest_control: "pest-control job",
  packing_moving: "move",
};

function historyPhrase(n: number): string {
  if (n === 0) return "First-time customer";
  if (n <= 2) return `Returning customer (${n} booking${n === 1 ? "" : "s"})`;
  return `Repeat customer (${n} bookings)`;
}

function stagePhrase(step: Lead["drop_off_step"]): string {
  switch (step) {
    case "pricing":
      return "stalled at pricing";
    case "scheduling":
      return "stalled at scheduling";
    case "service_selection":
      return "dropped at service selection";
    case "payment":
      return "dropped at payment";
  }
}

export function buildReason(lead: Lead, action: Action, override: boolean, intent: number): string {
  const value = `${formatAed(lead.basket_value_aed)} ${SERVICE_NOUN[lead.service]}`;
  const hist = historyPhrase(lead.past_bookings);
  if (override) {
    return `Customer asked for a callback about a ${value}; a requested call is always honoured.`;
  }
  if (action === "AGENT_CALL") {
    return `${hist} ${stagePhrase(lead.drop_off_step)} on a ${value}; app unlikely to close alone.`;
  }
  if (action === "WHATSAPP_NUDGE") {
    return `${hist} ${stagePhrase(lead.drop_off_step)} on a ${value}; a light WhatsApp nudge may unblock it.`;
  }
  // LEAVE_TO_APP
  if (lead.past_bookings >= 3) {
    const routine = APPFAIL_COMPLEXITY_POINTS[lead.service] <= 10 ? "routine " : "";
    const noun = SERVICE_LABELS[lead.service].toLowerCase();
    return `${hist} at ${STAGE_LABELS[lead.drop_off_step].toLowerCase()} for ${routine}${noun}; likely to self-serve.`;
  }
  if (intent < 40) {
    return `Low intent (${SOURCE_LABELS[lead.lead_source].toLowerCase()}, ${formatHours(lead.hours_since_dropoff)} ago) on a ${value}; agent time unlikely to pay back.`;
  }
  return `${hist} ${stagePhrase(lead.drop_off_step)} on a simple ${value}; app likely to handle it.`;
}

/* ------------------------------------------------------------------ */
/* Full score                                                          */
/* ------------------------------------------------------------------ */

export function scoreLead(
  lead: Lead,
  weights: Weights = DEFAULT_WEIGHTS,
  thresholds: Thresholds = DEFAULT_THRESHOLDS,
): LeadScore {
  const intent = intentScore(lead);
  const appFailure = appFailureScore(lead);
  const opportunity = clamp(
    Math.round((intent.total * weights.intent + appFailure.total * weights.appFailure) * 10) / 10,
    0,
    100,
  );
  const override = lead.lead_source === "call_me_back";
  const action: Action = override ? "AGENT_CALL" : actionForScore(opportunity, thresholds);
  return {
    intent,
    appFailure,
    opportunity,
    action,
    override,
    reason: buildReason(lead, action, override, intent.total),
  };
}
