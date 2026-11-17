"use client";

import { useRef, useState } from "react";
import { SOURCE_LABELS, type LeadSource } from "@/lib/config";
import { LeadDrawer } from "./LeadDrawer";
import { LeadTable, type SortKey } from "./LeadTable";
import { MethodologyPanel } from "./MethodologyPanel";
import { useFlipRows } from "./motion";
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
import { AnimatedNumber, cn, Disclosure, SectionHeading, Select } from "./ui";

type SourceFilter = "all" | LeadSource;
type HoldoutFilter = "all" | "holdout" | "treatable";
const TOP_N = 15;

const isChanged = (r: ScoredLead) => !r.holdout && r.finalAction !== r.baselineAction;

function StrategyControl({
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

  const changed = scored.filter(isChanged);
  const gained = changed.filter((r) => r.finalAction === "AGENT_CALL");
  const repeatGained = gained.filter((r) => r.lead.past_bookings >= 3);
  const lost = changed.filter((r) => r.baselineAction === "AGENT_CALL");
  const lostFirstTime = lost.filter((r) => r.lead.past_bookings === 0);
  const otherMoves = changed.length - gained.length - lost.length;
  const currentCalls = scored.filter((r) => r.finalAction === "AGENT_CALL").length;

  const options = [
    { id: "default", label: "Call where it changes the outcome", pct: DEFAULT_INTENT_PCT },
    { id: "high", label: "Call every high-intent lead", pct: HIGH_INTENT_PCT },
  ] as const;

  return (
    <div className="grid gap-6 border-y border-rule py-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
      <div className="min-w-0">
        <div id="strategy-label" className="text-[15px] font-semibold text-ink">
          Who should agents call?
        </div>
        <div
          role="radiogroup"
          aria-labelledby="strategy-label"
          className="mt-3 grid grid-cols-1 rounded-lg border border-ink/15 bg-surface p-1 min-[480px]:inline-grid min-[480px]:grid-cols-2"
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
                  "rounded-md px-4 py-2.5 text-[14px] font-medium transition-colors motion-reduce:transition-none",
                  active ? "bg-ink text-white" : "text-ink-2 hover:bg-canvas",
                )}
              >
                {o.label}
              </button>
            );
          })}
        </div>
        {mode === "custom" ? (
          <p className="mt-2 text-[13px] text-muted">
            Custom weights in use: intent {intentPct}%, app failure {100 - intentPct}%.
          </p>
        ) : null}
      </div>

      <div className="md:text-right" aria-live="polite">
        <div className="text-[13px] text-muted">Agent calls</div>
        <div className={cn("text-[52px] font-semibold leading-none tracking-[-0.02em]", mode === "default" ? "text-agent" : "text-ink")}>
          <AnimatedNumber value={currentCalls} format={(n) => String(Math.round(n))} />
        </div>
        <div className="mt-1 text-[13px] text-muted">
          {mode === "default" ? `${callsAtHighIntent} if every high-intent lead is called` : `was ${callsAtDefault} with outcome-based calling`}
        </div>
      </div>

      {changed.length > 0 ? (
        <div className="rounded-lg bg-iterate-soft px-4 py-3.5 text-[15px] leading-relaxed text-ink md:col-span-2">
          <p className="max-w-[80ch]">
            <span className="font-semibold">{gained.length} leads gain a call</span> and{" "}
            <span className="font-semibold">{lost.length} lose one</span>, so agent calls go from {callsAtDefault} to {currentCalls}.
            {otherMoves > 0 ? ` ${otherMoves} more move between WhatsApp and leave to app.` : ""}{" "}
            {gained.length > 0 && repeatGained.length / gained.length > 0.5
              ? `The new calls are mostly repeat customers likely to book anyway: ${repeatGained.length} of ${gained.length} have 3 or more past bookings.`
              : gained.length > 0
                ? `${repeatGained.length} of the ${gained.length} new calls go to repeat customers.`
                : ""}
            {lost.length > 0 ? ` Of those losing a call, ${lostFirstTime.length} are first-time customers.` : ""}
          </p>
          <button
            type="button"
            onClick={() => onChangedOnly(!changedOnly)}
            className="mt-1.5 font-semibold text-ink underline decoration-iterate/50 underline-offset-4 hover:decoration-iterate"
          >
            {changedOnly ? "Show all leads again" : `Show the ${changed.length} leads whose action changed`}
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function LeadWorkbench({ scoring }: { scoring: Scoring }) {
  const { scored, actionFilter: action, setActionFilter: setAction } = scoring;
  const [source, setSource] = useState<SourceFilter>("all");
  const [holdoutFilter, setHoldoutFilter] = useState<HoldoutFilter>("all");
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "opportunity", dir: "desc" });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [changedOnlyRaw, setChangedOnly] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useFlipRows(listRef, scoring.flash);

  const changedOnly = changedOnlyRaw && scored.some(isChanged);
  const val = (r: ScoredLead) =>
    sort.key === "intent" ? r.score.intent.total : sort.key === "appFailure" ? r.score.appFailure.total : r.score.opportunity;
  const filtered = scored
    .filter(
      (r) =>
        (source === "all" || r.lead.lead_source === source) &&
        (action === "all" || r.finalAction === action) &&
        (holdoutFilter === "all" || (holdoutFilter === "holdout" ? r.holdout : !r.holdout)) &&
        (!changedOnly || isChanged(r)),
    )
    .sort((a, b) => {
      const d = sort.dir === "desc" ? val(b) - val(a) : val(a) - val(b);
      return d !== 0 ? d : a.lead.id.localeCompare(b.lead.id);
    });
  const visible = showAll ? filtered : filtered.slice(0, TOP_N);

  const selected = scored.find((r) => r.lead.id === selectedId) ?? null;
  const filtersActive = source !== "all" || action !== "all" || holdoutFilter !== "all" || changedOnly;

  return (
    <section aria-labelledby="workbench-title" className="space-y-6">
      <SectionHeading id="workbench-title" title="Lead workbench">
        Sixty leads ranked by how likely an agent is to change the outcome, not by how keen the customer looks.
      </SectionHeading>

      <StrategyControl scoring={scoring} changedOnly={changedOnly} onChangedOnly={setChangedOnly} />

      <div id="lead-table" className="scroll-mt-6">
        <div className="flex flex-col gap-4 pb-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="grid grid-cols-3 gap-2 sm:gap-3 lg:flex">
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
              label="Holdout"
              value={holdoutFilter}
              onChange={setHoldoutFilter}
              options={[
                { value: "all", label: "All leads" },
                { value: "treatable", label: "Not in holdout" },
                { value: "holdout", label: "Holdout only" },
              ]}
            />
          </div>
          <div className="flex items-center gap-3 text-[13px] text-muted">
            <span>
              Showing <span className="font-semibold text-ink">{visible.length}</span> of {filtered.length}
              {filtered.length !== LEADS.length ? ` matching leads (${LEADS.length} in total)` : " leads"}
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
                className="rounded px-1.5 py-0.5 font-medium text-agent underline-offset-4 hover:underline"
              >
                Clear filters
              </button>
            ) : null}
          </div>
        </div>

        <div ref={listRef}>
          <LeadTable
            rows={visible}
            sort={sort}
            onSort={(key) =>
              setSort((s) => (s.key === key ? { key, dir: s.dir === "desc" ? "asc" : "desc" } : { key, dir: "desc" }))
            }
            onSelect={setSelectedId}
            selectedId={selectedId}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 text-[13px] text-muted">
          <span>Synthetic data. Illustrative only. Select a lead for its score breakdown and suggested approach.</span>
          {filtered.length > TOP_N ? (
            <button
              type="button"
              onClick={() => setShowAll((s) => !s)}
              className="rounded-md border border-rule bg-surface px-3 py-1.5 font-medium text-ink hover:border-ink/30"
            >
              {showAll ? `Show top ${TOP_N} only` : `Show all ${filtered.length} leads`}
            </button>
          ) : null}
        </div>
      </div>

      <div>
        <Disclosure
          title="Holdout and experiment control"
          summary={`${HOLDOUT_IDS.size} of ${ELIGIBLE_COUNT} eligible leads are held out, against a target of about 20%.`}
        >
          <div className="grid max-w-[80ch] gap-4 text-[15px] leading-relaxed text-ink-2 md:grid-cols-2 md:gap-8">
            <p>
              <span className="font-semibold text-ink">The holdout</span> is a fixed set of about 20% of eligible leads, chosen by a
              hash of the lead ID, that is never contacted. It is the permanent baseline that shows whether the assisted channel
              creates bookings at all. Weights, thresholds and filters never change who is in it, and callback requests are never
              held out.
            </p>
            <p>
              <span className="font-semibold text-ink">Experiment control</span> groups are drawn at random inside each experiment,
              from leads outside the holdout. They show whether one specific tactic beats the current process.
            </p>
          </div>
        </Disclosure>
        <MethodologyPanel scoring={scoring} />
      </div>

      <LeadDrawer row={selected} weights={scoring.weights} onClose={() => setSelectedId(null)} />
    </section>
  );
}
