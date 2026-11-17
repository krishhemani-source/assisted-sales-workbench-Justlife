"use client";

import { MessageSquareText, Phone, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { SERVICE_LABELS, SOURCE_LABELS, STAGE_LABELS } from "@/lib/config";
import { formatAed, formatHours, OVERRIDE_LABEL, type SubScore } from "@/lib/scoring";
import { draftMessage, suggestedApproach } from "@/lib/templates";
import type { Weights } from "@/lib/types";
import type { ScoredLead } from "./LeadWorkbench";
import { ActionBadge, SectionLabel } from "./ui";

function Breakdown({ title, sub, weight }: { title: string; sub: SubScore; weight: number }) {
  return (
    <div className="rounded-lg border border-zinc-200">
      <div className="flex items-baseline justify-between border-b border-zinc-200 px-3 py-2">
        <span className="text-sm font-medium text-zinc-900">{title}</span>
        <span className="text-xs text-zinc-500">
          <span className="text-sm font-semibold tabular-nums text-zinc-900">{sub.total}</span> / 100 · weight{" "}
          {Math.round(weight * 100)}%
        </span>
      </div>
      <table className="w-full text-sm">
        <tbody className="divide-y divide-zinc-100">
          {sub.components.map((c) => (
            <tr key={c.factor}>
              <td className="px-3 py-1.5 text-zinc-500">{c.factor}</td>
              <td className="px-3 py-1.5 text-zinc-700">{c.value}</td>
              <td className="whitespace-nowrap px-3 py-1.5 text-right tabular-nums text-zinc-900">
                {c.points}
                <span className="text-zinc-400"> / {c.max}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function LeadDrawer({ row, weights, onClose }: { row: ScoredLead | null; weights: Weights; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  const open = row !== null;

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!row) return null;
  const { lead, score, holdout, finalAction } = row;
  const approach = suggestedApproach(lead, finalAction, score.override);
  const draft = draftMessage(lead, finalAction, score.override);

  const context: [string, string][] = [
    ["Source", SOURCE_LABELS[lead.lead_source]],
    ["Service", SERVICE_LABELS[lead.service]],
    ["Drop-off step", STAGE_LABELS[lead.drop_off_step]],
    ["Basket", formatAed(lead.basket_value_aed)],
    ["Since drop-off", formatHours(lead.hours_since_dropoff)],
    ["Past bookings", String(lead.past_bookings)],
    ["City", lead.city],
  ];

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-labelledby="lead-drawer-title">
      <div className="absolute inset-0 bg-zinc-900/20" onClick={onClose} aria-hidden />
      <aside className="absolute inset-x-0 bottom-0 flex max-h-[90vh] flex-col rounded-t-2xl border border-zinc-200 bg-white shadow-xl md:inset-y-0 md:left-auto md:right-0 md:max-h-none md:w-[480px] md:rounded-none md:border-y-0 md:border-r-0">
        <header className="flex items-start justify-between gap-3 border-b border-zinc-200 px-5 py-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 id="lead-drawer-title" className="font-mono text-base font-semibold text-zinc-900">
                {lead.id}
              </h2>
              <ActionBadge action={finalAction} />
            </div>
            <p className="mt-1.5 text-sm leading-relaxed text-zinc-700">{score.reason}</p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
            aria-label="Close lead details"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
          {score.override ? (
            <div className="rounded-lg bg-indigo-50 px-3 py-2 text-sm text-indigo-800">{OVERRIDE_LABEL}.</div>
          ) : null}
          {holdout ? (
            <div className="rounded-lg bg-zinc-100 px-3 py-2 text-sm text-zinc-600">
              In the lead-level holdout. Without the holdout, the score would recommend:{" "}
              <ActionBadge action={score.action} className="ml-1 align-middle" />
            </div>
          ) : null}

          <section className="space-y-2">
            <SectionLabel>Lead context</SectionLabel>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              {context.map(([k, v]) => (
                <div key={k} className="min-w-0">
                  <dt className="text-xs text-zinc-500">{k}</dt>
                  <dd className="truncate text-zinc-900">{v}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="space-y-2">
            <SectionLabel>Score breakdown</SectionLabel>
            <Breakdown title="Intent" sub={score.intent} weight={weights.intent} />
            <Breakdown title="App-failure likelihood" sub={score.appFailure} weight={weights.appFailure} />
            <div className="rounded-lg bg-zinc-50 px-3 py-2.5 text-sm text-zinc-700">
              <span className="tabular-nums">
                {score.intent.total} × {weights.intent.toFixed(2)} + {score.appFailure.total} × {weights.appFailure.toFixed(2)} ={" "}
              </span>
              <span className="font-semibold tabular-nums text-zinc-900">{score.opportunity.toFixed(1)}</span>
              <span className="text-zinc-500"> estimated human intervention opportunity</span>
            </div>
          </section>

          <section className="space-y-2">
            <SectionLabel>Suggested approach</SectionLabel>
            <p className="text-sm leading-relaxed text-zinc-700">{approach.summary}</p>
            {approach.steps.length > 0 ? (
              <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-zinc-700">
                {approach.steps.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            ) : null}
          </section>

          {draft ? (
            <section className="space-y-2">
              <SectionLabel>{draft.channel}</SectionLabel>
              <div className="flex gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                {draft.channel === "Call opener" ? (
                  <Phone className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" aria-hidden />
                ) : (
                  <MessageSquareText className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" aria-hidden />
                )}
                <p className="text-sm leading-relaxed text-zinc-800">{draft.text}</p>
              </div>
            </section>
          ) : null}

          <p className="text-xs text-zinc-400">Synthetic data. Illustrative only.</p>
        </div>
      </aside>
    </div>
  );
}
