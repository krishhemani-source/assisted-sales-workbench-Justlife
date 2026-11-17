"use client";

import { useState } from "react";
import leadsJson from "@/data/leads.json";
import { DEFAULT_THRESHOLDS, DEFAULT_WEIGHTS, SOURCE_LABELS, type LeadSource } from "@/lib/config";
import { isInHoldout } from "@/lib/holdout";
import { scoreLead, validThresholds, weightsFromIntentPct, type LeadScore } from "@/lib/scoring";
import type { FinalAction, Lead, Thresholds } from "@/lib/types";
import { LeadTable, type SortKey } from "./LeadTable";
import { LeadDrawer } from "./LeadDrawer";
import { MethodologyPanel } from "./MethodologyPanel";
import { Card, InfoBox, Select, Stat } from "./ui";

const LEADS = leadsJson as Lead[];

/** Holdout is computed once from lead ids only, never from weights, thresholds, filters or sort. */
const HOLDOUT_IDS: ReadonlySet<string> = new Set(LEADS.filter(isInHoldout).map((l) => l.id));
const ELIGIBLE_COUNT = LEADS.filter((l) => l.lead_source !== "call_me_back").length;

export interface ScoredLead {
  lead: Lead;
  score: LeadScore;
  holdout: boolean;
  finalAction: FinalAction;
}

type SourceFilter = "all" | LeadSource;
type ActionFilter = "all" | FinalAction;
type HoldoutFilter = "all" | "holdout" | "treatable";

export function LeadWorkbench() {
  const [intentPct, setIntentPct] = useState(Math.round(DEFAULT_WEIGHTS.intent * 100));
  const [thresholdDraft, setThresholdDraft] = useState({
    agentCall: String(DEFAULT_THRESHOLDS.agentCall),
    whatsapp: String(DEFAULT_THRESHOLDS.whatsapp),
  });
  const [lastValid, setLastValid] = useState<Thresholds>({ ...DEFAULT_THRESHOLDS });
  const [source, setSource] = useState<SourceFilter>("all");
  const [action, setAction] = useState<ActionFilter>("all");
  const [holdoutFilter, setHoldoutFilter] = useState<HoldoutFilter>("all");
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "opportunity", dir: "desc" });
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const parsedThresholds: Thresholds = {
    agentCall: thresholdDraft.agentCall.trim() === "" ? NaN : Number(thresholdDraft.agentCall),
    whatsapp: thresholdDraft.whatsapp.trim() === "" ? NaN : Number(thresholdDraft.whatsapp),
  };
  const thresholdsValid = validThresholds(parsedThresholds);
  const thresholds = thresholdsValid ? parsedThresholds : lastValid;

  const onThresholdChange = (key: keyof Thresholds, value: string) => {
    const next = { ...thresholdDraft, [key]: value };
    setThresholdDraft(next);
    const parsed: Thresholds = {
      agentCall: next.agentCall.trim() === "" ? NaN : Number(next.agentCall),
      whatsapp: next.whatsapp.trim() === "" ? NaN : Number(next.whatsapp),
    };
    if (validThresholds(parsed)) setLastValid(parsed);
  };

  const resetDefaults = () => {
    setIntentPct(Math.round(DEFAULT_WEIGHTS.intent * 100));
    setThresholdDraft({ agentCall: String(DEFAULT_THRESHOLDS.agentCall), whatsapp: String(DEFAULT_THRESHOLDS.whatsapp) });
    setLastValid({ ...DEFAULT_THRESHOLDS });
  };

  const weights = weightsFromIntentPct(intentPct);

  // 60 leads: recomputing on every render is instant, so no memoisation needed.
  const scored: ScoredLead[] = LEADS.map((lead) => {
    const score = scoreLead(lead, weights, thresholds);
    const holdout = HOLDOUT_IDS.has(lead.id);
    return { lead, score, holdout, finalAction: holdout ? "HOLDOUT" : score.action };
  });

  const visible = (() => {
    const rows = scored.filter(
      (r) =>
        (source === "all" || r.lead.lead_source === source) &&
        (action === "all" || r.finalAction === action) &&
        (holdoutFilter === "all" || (holdoutFilter === "holdout" ? r.holdout : !r.holdout)),
    );
    const val = (r: ScoredLead) =>
      sort.key === "intent" ? r.score.intent.total : sort.key === "appFailure" ? r.score.appFailure.total : r.score.opportunity;
    return rows.sort((a, b) => {
      const d = sort.dir === "desc" ? val(b) - val(a) : val(a) - val(b);
      return d !== 0 ? d : a.lead.id.localeCompare(b.lead.id);
    });
  })();

  const counts = visible.reduce(
    (acc, r) => {
      acc[r.finalAction]++;
      return acc;
    },
    { AGENT_CALL: 0, WHATSAPP_NUDGE: 0, LEAVE_TO_APP: 0, HOLDOUT: 0 } as Record<FinalAction, number>,
  );

  const selected = scored.find((r) => r.lead.id === selectedId) ?? null;
  const filtersActive = source !== "all" || action !== "all" || holdoutFilter !== "all";

  return (
    <div className="space-y-5">
      <Card className="grid grid-cols-2 gap-x-6 gap-y-4 p-4 sm:grid-cols-4 sm:p-5">
        <Stat label="Leads shown" value={visible.length} sub={`of ${LEADS.length}`} />
        <Stat label="Agent call" value={counts.AGENT_CALL} />
        <Stat label="WhatsApp nudge" value={counts.WHATSAPP_NUDGE} />
        <Stat label="Leave to app" value={counts.LEAVE_TO_APP} sub={`+ ${counts.HOLDOUT} in holdout`} />
      </Card>

      <InfoBox>
        <p>
          <span className="font-medium text-zinc-800">Two different control groups.</span> The{" "}
          <span className="font-medium text-zinc-800">lead-level holdout</span> (≈20% of eligible leads, fixed by a hash of the
          lead ID) is never contacted. It is a permanent baseline that tells us whether the assisted channel creates bookings at
          all. <span className="font-medium text-zinc-800">Experiment control</span> groups are randomised inside each experiment
          among non-holdout leads, and tell us whether one specific tactic beats the current process. Callback requests are never
          held out.
        </p>
      </InfoBox>

      <MethodologyPanel
        intentPct={intentPct}
        onIntentPct={setIntentPct}
        thresholdDraft={thresholdDraft}
        thresholdsValid={thresholdsValid}
        appliedThresholds={thresholds}
        onThreshold={onThresholdChange}
        onReset={resetDefaults}
      />

      <Card>
        <div className="flex flex-col gap-3 border-b border-zinc-200 p-4 sm:flex-row sm:items-end sm:justify-between sm:px-5">
          <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-3 sm:flex sm:gap-3">
            <Select<SourceFilter>
              label="Source"
              value={source}
              onChange={setSource}
              options={[
                { value: "all", label: "All sources" },
                ...(Object.keys(SOURCE_LABELS) as LeadSource[]).map((s) => ({ value: s, label: SOURCE_LABELS[s] })),
              ]}
            />
            <Select<ActionFilter>
              label="Action"
              value={action}
              onChange={setAction}
              options={[
                { value: "all", label: "All actions" },
                { value: "AGENT_CALL", label: "Agent call" },
                { value: "WHATSAPP_NUDGE", label: "WhatsApp nudge" },
                { value: "LEAVE_TO_APP", label: "Leave to app" },
                { value: "HOLDOUT", label: "Holdout" },
              ]}
            />
            <Select<HoldoutFilter>
              label="Holdout status"
              value={holdoutFilter}
              onChange={setHoldoutFilter}
              options={[
                { value: "all", label: "All leads" },
                { value: "treatable", label: "Not in holdout" },
                { value: "holdout", label: "Holdout only" },
              ]}
            />
          </div>
          <div className="flex items-center justify-between gap-3 text-xs text-zinc-500 sm:justify-end">
            <span>
              Holdout: {HOLDOUT_IDS.size} of {ELIGIBLE_COUNT} eligible (≈20% target)
            </span>
            {filtersActive ? (
              <button
                type="button"
                onClick={() => {
                  setSource("all");
                  setAction("all");
                  setHoldoutFilter("all");
                }}
                className="rounded-md px-2 py-1 font-medium text-zinc-700 hover:bg-zinc-100"
              >
                Clear filters
              </button>
            ) : null}
          </div>
        </div>
        <LeadTable
          rows={visible}
          sort={sort}
          onSort={(key) =>
            setSort((s) => (s.key === key ? { key, dir: s.dir === "desc" ? "asc" : "desc" } : { key, dir: "desc" }))
          }
          onSelect={setSelectedId}
          selectedId={selectedId}
        />
        <div className="border-t border-zinc-200 px-4 py-2.5 text-xs text-zinc-500 sm:px-5">
          Synthetic data. Illustrative only. Click a lead for the score breakdown and suggested approach.
        </div>
      </Card>

      <LeadDrawer row={selected} weights={weights} onClose={() => setSelectedId(null)} />
    </div>
  );
}
