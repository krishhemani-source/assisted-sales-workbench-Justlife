"use client";

import { useState } from "react";
import leadsJson from "@/data/leads.json";
import { DEFAULT_THRESHOLDS, DEFAULT_WEIGHTS } from "@/lib/config";
import { isInHoldout } from "@/lib/holdout";
import { scoreLead, validThresholds, weightsFromIntentPct, type LeadScore } from "@/lib/scoring";
import type { FinalAction, Lead, Thresholds, Weights } from "@/lib/types";

export const LEADS = leadsJson as Lead[];

/** Holdout is computed once from lead ids only, never from weights, thresholds, filters or sort. */
export const HOLDOUT_IDS: ReadonlySet<string> = new Set(LEADS.filter(isInHoldout).map((l) => l.id));
export const ELIGIBLE_COUNT = LEADS.filter((l) => l.lead_source !== "call_me_back").length;

export const DEFAULT_INTENT_PCT = Math.round(DEFAULT_WEIGHTS.intent * 100);
export const HIGH_INTENT_PCT = 80;

export interface ScoredLead {
  lead: Lead;
  score: LeadScore;
  holdout: boolean;
  finalAction: FinalAction;
  /** Final action under default weights (same thresholds), to show what a weight change moved. */
  baselineAction: FinalAction;
}

export type ActionFilter = "all" | FinalAction;

function scoreAll(weights: Weights, thresholds: Thresholds) {
  return LEADS.map((lead) => {
    const score = scoreLead(lead, weights, thresholds);
    const holdout = HOLDOUT_IDS.has(lead.id);
    return { lead, score, holdout, finalAction: (holdout ? "HOLDOUT" : score.action) as FinalAction };
  });
}

export function countCalls(intentPct: number, thresholds: Thresholds): number {
  return scoreAll(weightsFromIntentPct(intentPct), thresholds).filter((r) => r.finalAction === "AGENT_CALL").length;
}

const parse = (d: { agentCall: string; whatsapp: string }): Thresholds => ({
  agentCall: d.agentCall.trim() === "" ? NaN : Number(d.agentCall),
  whatsapp: d.whatsapp.trim() === "" ? NaN : Number(d.whatsapp),
});

/** All lead-scoring UI state, shared by the hero and the Lead Workbench. 60 leads: recomputing per render is instant. */
export function useScoring() {
  const [intentPct, setIntentPct] = useState(DEFAULT_INTENT_PCT);
  const [thresholdDraft, setThresholdDraft] = useState({
    agentCall: String(DEFAULT_THRESHOLDS.agentCall),
    whatsapp: String(DEFAULT_THRESHOLDS.whatsapp),
  });
  const [lastValid, setLastValid] = useState<Thresholds>({ ...DEFAULT_THRESHOLDS });
  const [actionFilter, setActionFilter] = useState<ActionFilter>("all");

  const parsed = parse(thresholdDraft);
  const thresholdsValid = validThresholds(parsed);
  const thresholds = thresholdsValid ? parsed : lastValid;
  const weights = weightsFromIntentPct(intentPct);

  const baseline = scoreAll(weightsFromIntentPct(DEFAULT_INTENT_PCT), thresholds);
  const scored: ScoredLead[] = scoreAll(weights, thresholds).map((r, i) => ({ ...r, baselineAction: baseline[i].finalAction }));

  const onThreshold = (key: keyof Thresholds, value: string) => {
    const next = { ...thresholdDraft, [key]: value };
    setThresholdDraft(next);
    const p = parse(next);
    if (validThresholds(p)) setLastValid(p);
  };

  const reset = () => {
    setIntentPct(DEFAULT_INTENT_PCT);
    setThresholdDraft({ agentCall: String(DEFAULT_THRESHOLDS.agentCall), whatsapp: String(DEFAULT_THRESHOLDS.whatsapp) });
    setLastValid({ ...DEFAULT_THRESHOLDS });
  };

  return {
    intentPct,
    setIntentPct,
    weights,
    thresholdDraft,
    thresholdsValid,
    thresholds,
    onThreshold,
    reset,
    scored,
    actionFilter,
    setActionFilter,
    callsAtDefault: countCalls(DEFAULT_INTENT_PCT, thresholds),
    callsAtHighIntent: countCalls(HIGH_INTENT_PCT, thresholds),
  };
}

export type Scoring = ReturnType<typeof useScoring>;
