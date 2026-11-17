"use client";

import { ArrowRight, ShieldQuestion } from "lucide-react";
import { useState } from "react";
import { SOURCE_LABELS, type LeadSource } from "@/lib/config";
import { LeadDrawer } from "./LeadDrawer";
import { LeadTable, type SortKey } from "./LeadTable";
import { MethodologyPanel } from "./MethodologyPanel";
import {
  DEFAULT_INTENT_PCT,
  ELIGIBLE_COUNT,
  HIGH_INTENT_PCT,
  HOLDOUT_IDS,
  LEADS,
  type ActionFilter,
  type Scoring,
  type ScoredLead,
} from "./useScoring";
import { Card, cn, Collapsible, Select } from "./ui";

type SourceFilter = "all" | LeadSource;
type HoldoutFilter = "all" | "holdout" | "treatable";

function StrategyToggle({
  scoring,
  changedOnly,
  onChangedOnly,
}: {
  scoring: Scoring;
  changedOnly: boolean;
  onChangedOnly: (v: boolean) => void;
}) {
  const { intentPct, setIntentPct, callsAtDefault, callsAtHighIntent, scored } = scoring;
  const mode = intentPct === HIGH_INTENT_PCT ? "high" : intentPct === DEFAULT_INTENT_PCT ? "default" : "custom";

  const changed = scored.filter((r) => !r.holdout && r.finalAction !== r.baselineAction);
  const gained = changed.filter((r) => r.finalAction === "AGENT_CALL");
  const repeatGained = gained.filter((r) => r.lead.past_bookings >= 3);
  const lost = changed.filter((r) => r.baselineAction === "AGENT_CALL");
  const lostFirstTime = lost.filter((r) => r.lead.past_bookings === 0);
  const currentCalls = scored.filter((r) => r.finalAction === "AGENT_CALL").length;

  const options = [
    { id: "high", label: "Call every high-intent lead", pct: HIGH_INTENT_PCT },
    { id: "default", label: "Call where it changes the outcome", pct: DEFAULT_INTENT_PCT },
  ] as const;

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-zinc-900">Who should agents call?</div>
          <div
            role="radiogroup"
            aria-label="Calling strategy"
            className="mt-3 inline-flex w-full flex-col gap-1 rounded-xl bg-zinc-100 p-1 sm:w-auto sm:flex-row"
          >
            {options.map((o) => {
              const active = mode === o.id;
              return (
                <button
                  key={o.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setIntentPct(o.pct)}
                  className={cn(
                    "rounded-lg px-4 py-2 text-sm font-medium transition",
                    active ? "bg-emerald-800 text-white shadow-sm" : "text-zinc-600 hover:bg-white/70 hover:text-zinc-900",
                  )}
                >
                  {o.label}
                </button>
              );
            })}
          </div>
          {mode === "custom" ? (
            <p className="mt-2 text-xs text-zinc-500">
              Custom weights in use (intent {intentPct}% / app-failure {100 - intentPct}%).
            </p>
          ) : null}
        </div>

        <div className="flex items-center gap-3 lg:justify-end">
          <div className="lg:text-right">
            <div className="text-xs text-zinc-500">Agent calls</div>
            {mode === "default" ? (
              <>
                <div className="mt-0.5 text-3xl font-semibold tabular-nums tracking-tight text-emerald-800">{callsAtDefault}</div>
                <div className="text-[11px] text-zinc-500">→ {callsAtHighIntent} if you call every high-intent lead</div>
              </>
            ) : (
              <>
                <div className="mt-0.5 flex items-center gap-2 text-3xl font-semibold tabular-nums tracking-tight lg:justify-end">
                  <span className="text-zinc-400">{callsAtDefault}</span>
                  <ArrowRight className="h-5 w-5 text-zinc-300" aria-hidden />
                  <span className="text-zinc-950">{currentCalls}</span>
                </div>
                <div className="text-[11px] text-zinc-500">before → after</div>
              </>
            )}
          </div>
        </div>
      </div>

      {changed.length > 0 ? (
        <div className="mt-5 rounded-xl bg-amber-50 px-4 py-4 text-sm leading-relaxed text-amber-950">
          <dl className="grid grid-cols-3 gap-3">
            <div>
              <dt className="text-xs text-amber-800">Gain a call</dt>
              <dd className="text-xl font-semibold tabular-nums">+{gained.length}</dd>
            </div>
            <div>
              <dt className="text-xs text-amber-800">Lose a call</dt>
              <dd className="text-xl font-semibold tabular-nums">−{lost.length}</dd>
            </div>
            <div>
              <dt className="text-xs text-amber-800">Action changed (any)</dt>
              <dd className="text-xl font-semibold tabular-nums">{changed.length}</dd>
            </div>
          </dl>
          <p className="mt-3">
            Agent calls go from {callsAtDefault} to {currentCalls} ({callsAtDefault} + {gained.length} − {lost.length}). The other{" "}
            {changed.length - gained.length - lost.length} changes are moves between WhatsApp and leave-to-app.{" "}
            {gained.length > 0 && repeatGained.length / gained.length > 0.5 ? (
              <>
                The new calls are mostly repeat customers likely to book anyway: {repeatGained.length} of {gained.length} have 3+
                past bookings.
              </>
            ) : gained.length > 0 ? (
              <>
                {repeatGained.length} of the {gained.length} new calls go to repeat customers with 3+ bookings.
              </>
            ) : null}
            {lost.length > 0 ? (
              <>
                {" "}
                {lost.length} {lost.length === 1 ? "loses its" : "lose their"} call ({lostFirstTime.length} of them first-time
                customers).
              </>
            ) : null}
          </p>
          <button
            type="button"
            onClick={() => onChangedOnly(!changedOnly)}
            className="mt-2 font-semibold text-amber-950 underline decoration-amber-400 underline-offset-2 hover:decoration-amber-700"
          >
            {changedOnly ? "Show all leads" : `Show the ${changed.length} leads whose action changed`}
          </button>
        </div>
      ) : null}
    </Card>
  );
}

export function LeadWorkbench({ scoring }: { scoring: Scoring }) {
  const { scored, actionFilter: action, setActionFilter: setAction } = scoring;
  const [source, setSource] = useState<SourceFilter>("all");
  const [holdoutFilter, setHoldoutFilter] = useState<HoldoutFilter>("all");
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "opportunity", dir: "desc" });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [changedOnlyRaw, setChangedOnly] = useState(false);
  const anyChanged = scored.some((r) => !r.holdout && r.finalAction !== r.baselineAction);
  const changedOnly = changedOnlyRaw && anyChanged;

  const val = (r: ScoredLead) =>
    sort.key === "intent" ? r.score.intent.total : sort.key === "appFailure" ? r.score.appFailure.total : r.score.opportunity;
  const visible = scored
    .filter(
      (r) =>
        (source === "all" || r.lead.lead_source === source) &&
        (action === "all" || r.finalAction === action) &&
        (holdoutFilter === "all" || (holdoutFilter === "holdout" ? r.holdout : !r.holdout)) &&
        (!changedOnly || (!r.holdout && r.finalAction !== r.baselineAction)),
    )
    .sort((a, b) => {
      const d = sort.dir === "desc" ? val(b) - val(a) : val(a) - val(b);
      return d !== 0 ? d : a.lead.id.localeCompare(b.lead.id);
    });

  const counts = { AGENT_CALL: 0, WHATSAPP_NUDGE: 0, LEAVE_TO_APP: 0, HOLDOUT: 0 };
  for (const r of visible) counts[r.finalAction]++;

  const selected = scored.find((r) => r.lead.id === selectedId) ?? null;
  const filtersActive = source !== "all" || action !== "all" || holdoutFilter !== "all" || changedOnly;

  return (
    <div className="space-y-4">
      <StrategyToggle scoring={scoring} changedOnly={changedOnly} onChangedOnly={setChangedOnly} />

      <Card id="lead-table" className="scroll-mt-4 overflow-hidden">
        <div className="flex flex-col gap-4 px-5 pb-4 pt-5 sm:px-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-3 lg:flex">
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
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500 lg:justify-end">
            <span className="tabular-nums">
              <span className="font-medium text-zinc-800">{visible.length}</span> of {LEADS.length} leads · {counts.AGENT_CALL}{" "}
              call · {counts.WHATSAPP_NUDGE} WhatsApp · {counts.LEAVE_TO_APP} app · {counts.HOLDOUT} holdout
            </span>
            {filtersActive ? (
              <button
                type="button"
                onClick={() => {
                  setSource("all");
                  setAction("all");
                  setHoldoutFilter("all");
                  setChangedOnly(false);
                }}
                className="rounded-md px-2 py-1 font-medium text-emerald-800 hover:bg-emerald-50"
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
        <div className="px-5 py-3 text-xs text-zinc-400 sm:px-6">
          Synthetic data. Illustrative only. Click a lead for its score breakdown and suggested approach.
        </div>
      </Card>

      <Collapsible
        title="Holdout vs experiment control"
        subtitle={`${HOLDOUT_IDS.size} of ${ELIGIBLE_COUNT} eligible leads are held out (≈20% target)`}
        icon={<ShieldQuestion className="h-4 w-4" />}
      >
        <div className="grid gap-4 text-sm leading-relaxed text-zinc-600 md:grid-cols-2">
          <p>
            <span className="font-medium text-zinc-900">Lead-level holdout.</span> About 20% of eligible leads, fixed by a hash of
            the lead ID, are never contacted. They form a permanent baseline that shows whether the assisted channel creates
            bookings at all. Weights, thresholds and filters never change who is held out. Callback requests are never held out.
          </p>
          <p>
            <span className="font-medium text-zinc-900">Experiment control.</span> Inside each experiment, non-holdout leads are
            randomised into treatment and control. That shows whether one specific tactic beats the current process.
          </p>
        </div>
      </Collapsible>

      <MethodologyPanel scoring={scoring} />

      <LeadDrawer row={selected} weights={scoring.weights} onClose={() => setSelectedId(null)} />
    </div>
  );
}
