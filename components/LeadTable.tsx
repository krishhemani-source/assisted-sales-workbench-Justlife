"use client";

import { ArrowDown, ArrowUp, ChevronRight } from "lucide-react";
import { SERVICE_LABELS, SOURCE_LABELS } from "@/lib/config";
import type { ScoredLead } from "./useScoring";
import { ACTION_META, ActionBadge, cn } from "./ui";

export type SortKey = "opportunity" | "intent" | "appFailure";

function OpportunityCell({ value }: { value: number }) {
  return (
    <div className="flex items-center justify-end gap-3">
      <div className="hidden h-1 w-20 rounded-full bg-rule sm:block" aria-hidden>
        <div className="h-full rounded-full bg-agent" style={{ width: `${value}%` }} />
      </div>
      <span className="w-10 text-right font-semibold text-ink">{value.toFixed(1)}</span>
    </div>
  );
}

function SortHeader({
  label,
  k,
  sort,
  onSort,
}: {
  label: string;
  k: SortKey;
  sort: { key: SortKey; dir: "asc" | "desc" };
  onSort: (k: SortKey) => void;
}) {
  const active = sort.key === k;
  return (
    <th
      scope="col"
      className="sticky top-0 z-10 bg-surface px-3 py-3 text-right font-medium"
      aria-sort={active ? (sort.dir === "desc" ? "descending" : "ascending") : "none"}
    >
      <button
        type="button"
        onClick={() => onSort(k)}
        className={cn("inline-flex items-center gap-1 hover:text-ink", active && "text-ink")}
      >
        {active ? (
          sort.dir === "desc" ? <ArrowDown className="h-3 w-3" aria-hidden /> : <ArrowUp className="h-3 w-3" aria-hidden />
        ) : null}
        {label}
      </button>
    </th>
  );
}

function Tags({ r }: { r: ScoredLead }) {
  const changed = !r.holdout && r.finalAction !== r.baselineAction;
  return (
    <>
      {r.score.override && !r.holdout ? (
        <span
          className="rounded-[4px] bg-canvas px-1.5 py-0.5 text-[12px] text-muted ring-1 ring-inset ring-rule"
          title="Override: customer explicitly requested a callback"
        >
          Requested callback
        </span>
      ) : null}
      {changed ? (
        <span className="text-[12px] font-medium text-iterate">was {ACTION_META[r.baselineAction].label.toLowerCase()}</span>
      ) : null}
    </>
  );
}

export function LeadTable({
  rows,
  sort,
  onSort,
  onSelect,
  selectedId,
}: {
  rows: ScoredLead[];
  sort: { key: SortKey; dir: "asc" | "desc" };
  onSort: (k: SortKey) => void;
  onSelect: (id: string) => void;
  selectedId: string | null;
}) {
  if (rows.length === 0) {
    return <div className="border-y border-rule py-12 text-center text-[15px] text-muted">No leads match these filters.</div>;
  }
  const th = "sticky top-0 z-10 bg-surface px-3 py-3 text-left font-medium";
  return (
    <div className="rounded-lg border border-rule bg-surface">
      {/* Table from tablet up */}
      <table className="hidden w-full text-[14px] md:table">
        <thead className="text-[13px] text-muted">
          <tr className="[&>th]:border-b [&>th]:border-rule">
            <th scope="col" className={cn(th, "rounded-tl-lg pl-5")}>Lead</th>
            <th scope="col" className={th}>Source</th>
            <th scope="col" className={th}>Service</th>
            <th scope="col" className={cn(th, "hidden lg:table-cell")}>City</th>
            <SortHeader label="Intent" k="intent" sort={sort} onSort={onSort} />
            <SortHeader label="App failure" k="appFailure" sort={sort} onSort={onSort} />
            <SortHeader label="Opportunity" k="opportunity" sort={sort} onSort={onSort} />
            <th scope="col" className={cn(th, "rounded-tr-lg pl-6 pr-5")}>Recommended action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-rule/70">
          {rows.map((r) => (
            <tr
              key={r.lead.id}
              data-flip-id={r.lead.id}
              onClick={() => onSelect(r.lead.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(r.lead.id);
                }
              }}
              tabIndex={0}
              aria-label={`Lead ${r.lead.id}, ${ACTION_META[r.finalAction].label}. Open details`}
              className={cn(
                "relative cursor-pointer bg-surface hover:bg-canvas/70 focus-visible:bg-canvas",
                selectedId === r.lead.id && "bg-canvas",
              )}
            >
              <td className="py-3.5 pl-5 pr-3 font-medium text-ink">{r.lead.id}</td>
              <td className="px-3 py-3.5 text-ink-2">{SOURCE_LABELS[r.lead.lead_source]}</td>
              <td className="px-3 py-3.5 text-ink-2">{SERVICE_LABELS[r.lead.service]}</td>
              <td className="hidden px-3 py-3.5 text-muted lg:table-cell">{r.lead.city}</td>
              <td className="px-3 py-3.5 text-right text-ink-2">{r.score.intent.total}</td>
              <td className="px-3 py-3.5 text-right text-ink-2">{r.score.appFailure.total}</td>
              <td className="px-3 py-3.5">
                <OpportunityCell value={r.score.opportunity} />
              </td>
              <td className="py-3.5 pl-6 pr-5">
                <div className="flex flex-wrap items-center gap-2">
                  <ActionBadge action={r.finalAction} />
                  <Tags r={r} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Phone: stacked rows */}
      <ul className="divide-y divide-rule/70 md:hidden">
        {rows.map((r) => (
          <li key={r.lead.id} data-flip-id={r.lead.id} className="bg-surface first:rounded-t-lg last:rounded-b-lg">
            <button
              type="button"
              onClick={() => onSelect(r.lead.id)}
              className="flex w-full items-center gap-3 px-4 py-4 text-left"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-ink">{r.lead.id}</span>
                  <ActionBadge action={r.finalAction} />
                </div>
                <div className="mt-1 truncate text-[14px] text-ink-2">
                  {SERVICE_LABELS[r.lead.service]}, {SOURCE_LABELS[r.lead.lead_source]}
                </div>
                <div className="mt-2 flex items-center gap-3 text-[13px] text-muted">
                  <span>Opportunity <span className="font-semibold text-ink">{r.score.opportunity.toFixed(1)}</span></span>
                  <div className="h-1 flex-1 rounded-full bg-rule" aria-hidden>
                    <div className="h-full rounded-full bg-agent" style={{ width: `${r.score.opportunity}%` }} />
                  </div>
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-2 empty:hidden">
                  <Tags r={r} />
                </div>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted" aria-hidden />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
