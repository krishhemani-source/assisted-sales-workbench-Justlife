"use client";

import { ArrowDown, ArrowUp, ChevronRight } from "lucide-react";
import { SERVICE_LABELS, SOURCE_LABELS } from "@/lib/config";
import type { ScoredLead } from "./useScoring";
import { ACTION_META, ActionBadge, cn } from "./ui";

export type SortKey = "opportunity" | "intent" | "appFailure";

function OpportunityBar({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-9 text-right text-sm font-semibold tabular-nums text-zinc-900">{value.toFixed(1)}</span>
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-zinc-100" aria-hidden>
        <div className="h-full rounded-full bg-emerald-800" style={{ width: `${value}%` }} />
      </div>
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
      className="px-3 py-3 text-left"
      aria-sort={active ? (sort.dir === "desc" ? "descending" : "ascending") : "none"}
    >
      <button
        type="button"
        onClick={() => onSort(k)}
        className={cn("inline-flex items-center gap-1 font-medium hover:text-zinc-900", active && "text-zinc-900")}
      >
        {label}
        {active ? (
          sort.dir === "desc" ? <ArrowDown className="h-3 w-3" aria-hidden /> : <ArrowUp className="h-3 w-3" aria-hidden />
        ) : null}
      </button>
    </th>
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
    return <div className="px-5 py-12 text-center text-sm text-zinc-500">No leads match these filters.</div>;
  }
  return (
    <>
      {/* Desktop / tablet table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <thead className="border-y border-zinc-100 bg-zinc-50/70 text-xs text-zinc-500">
            <tr>
              <th scope="col" className="px-3 py-3 pl-6 text-left font-medium">Lead</th>
              <th scope="col" className="px-3 py-3 text-left font-medium">Source</th>
              <th scope="col" className="px-3 py-3 text-left font-medium">Service</th>
              <th scope="col" className="hidden px-3 py-3 text-left font-medium lg:table-cell">City</th>
              <SortHeader label="Intent" k="intent" sort={sort} onSort={onSort} />
              <SortHeader label="App-failure" k="appFailure" sort={sort} onSort={onSort} />
              <SortHeader label="Opportunity" k="opportunity" sort={sort} onSort={onSort} />
              <th scope="col" className="px-3 py-3 text-left font-medium">Action</th>
              <th scope="col" className="px-3 py-3 pr-6 text-left font-medium">Holdout</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {rows.map((r) => {
              const changed = !r.holdout && r.finalAction !== r.baselineAction;
              return (
              <tr
                key={r.lead.id}
                onClick={() => onSelect(r.lead.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect(r.lead.id);
                  }
                }}
                tabIndex={0}
                className={cn(
                  "cursor-pointer outline-none hover:bg-zinc-50 focus-visible:bg-zinc-50",
                  selectedId === r.lead.id && "bg-zinc-50",
                  changed && "bg-amber-50/70 hover:bg-amber-50",
                )}
              >
                <td className="px-3 py-3 pl-6 font-mono text-xs font-medium text-zinc-900">{r.lead.id}</td>
                <td className="px-3 py-3 text-zinc-700">{SOURCE_LABELS[r.lead.lead_source]}</td>
                <td className="px-3 py-3 text-zinc-700">{SERVICE_LABELS[r.lead.service]}</td>
                <td className="hidden px-3 py-3 text-zinc-500 lg:table-cell">{r.lead.city}</td>
                <td className="px-3 py-3 tabular-nums text-zinc-600">{r.score.intent.total}</td>
                <td className="px-3 py-3 tabular-nums text-zinc-600">{r.score.appFailure.total}</td>
                <td className="px-3 py-3">
                  <OpportunityBar value={r.score.opportunity} />
                </td>
                <td className="px-3 py-3">
                  <ActionBadge action={r.finalAction} />
                  {r.score.override && !r.holdout ? (
                    <span className="ml-1.5 text-[11px] text-zinc-400" title="Override: customer explicitly requested a callback">
                      override
                    </span>
                  ) : null}
                  {changed ? (
                    <span className="ml-1.5 whitespace-nowrap text-[11px] font-medium text-amber-800">
                      was {ACTION_META[r.baselineAction].label.toLowerCase()}
                    </span>
                  ) : null}
                </td>
                <td className="px-3 py-3 pr-6 text-xs text-zinc-500">{r.holdout ? "Holdout" : "—"}</td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile stacked cards */}
      <ul className="divide-y divide-zinc-100 md:hidden">
        {rows.map((r) => {
          const changed = !r.holdout && r.finalAction !== r.baselineAction;
          return (
          <li key={r.lead.id}>
            <button
              type="button"
              onClick={() => onSelect(r.lead.id)}
              className={cn("flex w-full items-start gap-3 px-5 py-4 text-left hover:bg-zinc-50", changed && "bg-amber-50/70")}
            >
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-medium text-zinc-900">{r.lead.id}</span>
                  <ActionBadge action={r.finalAction} />
                </div>
                <div className="truncate text-sm text-zinc-700">
                  {SERVICE_LABELS[r.lead.service]} · {SOURCE_LABELS[r.lead.lead_source]}
                </div>
                <div className="flex items-center justify-between gap-2 text-xs text-zinc-500">
                  <span className="tabular-nums">
                    Intent {r.score.intent.total} · App-fail {r.score.appFailure.total} · {r.lead.city}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <OpportunityBar value={r.score.opportunity} />
                  {changed ? (
                    <span className="text-[11px] font-medium text-amber-800">
                      was {ACTION_META[r.baselineAction].label.toLowerCase()}
                    </span>
                  ) : null}
                </div>
              </div>
              <ChevronRight className="mt-6 h-4 w-4 shrink-0 text-zinc-300" aria-hidden />
            </button>
          </li>
          );
        })}
      </ul>
    </>
  );
}
