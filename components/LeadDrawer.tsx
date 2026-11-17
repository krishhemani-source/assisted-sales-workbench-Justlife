"use client";

import { MessageSquareText, Phone, X } from "lucide-react";
import { useRef } from "react";
import { SERVICE_LABELS, SOURCE_LABELS, STAGE_LABELS } from "@/lib/config";
import { formatAed, formatHours, OVERRIDE_LABEL, type SubScore } from "@/lib/scoring";
import { draftMessage, suggestedApproach } from "@/lib/templates";
import type { Weights } from "@/lib/types";
import { useFocusTrap } from "./motion";
import type { ScoredLead } from "./useScoring";
import { ActionBadge, SubLabel } from "./ui";

// Component shades of the single accent, strongest first.
const SHADES = ["#0e5c49", "#3f8270", "#7aa99b", "#b5d0c7"];

function StackedScore({ title, sub, weight }: { title: string; sub: SubScore; weight: number }) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-[15px] font-semibold text-ink">{title}</span>
        <span className="text-[13px] text-muted">
          <span className="text-[17px] font-semibold text-ink">{sub.total}</span> of 100, weighted {Math.round(weight * 100)}%
        </span>
      </div>
      <div className="mt-2 flex h-3 w-full overflow-hidden rounded-[3px] bg-rule/70" aria-hidden>
        {sub.components.map((c, i) =>
          c.points > 0 ? (
            <div key={c.factor} className="h-full border-r-2 border-surface last:border-r-0" style={{ width: `${c.points}%`, background: SHADES[i] }} />
          ) : null,
        )}
      </div>
      <ul className="mt-2.5 space-y-1.5 text-[14px]">
        {sub.components.map((c, i) => (
          <li key={c.factor} className="flex items-baseline gap-2.5">
            <span className="relative top-[1px] inline-block h-2.5 w-2.5 shrink-0 rounded-[2px]" style={{ background: SHADES[i] }} aria-hidden />
            <span className="min-w-0 flex-1 text-ink-2">
              {c.factor}: <span className="text-muted">{c.value}</span>
            </span>
            <span className="shrink-0 text-right text-ink">
              <span className="font-semibold">{c.points}</span>
              <span className="text-muted"> / {c.max}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function LeadDrawer({ row, weights, onClose }: { row: ScoredLead | null; weights: Weights; onClose: () => void }) {
  const panelRef = useRef<HTMLElement>(null);
  useFocusTrap(panelRef, row !== null, onClose);

  if (!row) return null;
  const { lead, score, holdout, finalAction } = row;
  const approach = suggestedApproach(lead, finalAction, score.override);
  const draft = draftMessage(lead, finalAction, score.override);

  const context: [string, string][] = [
    ["Source", SOURCE_LABELS[lead.lead_source]],
    ["Service", SERVICE_LABELS[lead.service]],
    ["Stopped at", STAGE_LABELS[lead.drop_off_step]],
    ["Basket", formatAed(lead.basket_value_aed)],
    ["Since drop-off", formatHours(lead.hours_since_dropoff)],
    ["Past bookings", String(lead.past_bookings)],
    ["City", lead.city],
  ];

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-labelledby="lead-drawer-title">
      <div className="drawer-backdrop absolute inset-0 bg-ink/25" onClick={onClose} aria-hidden />
      <aside
        ref={panelRef}
        className="drawer-panel absolute inset-x-0 bottom-0 flex max-h-[90vh] flex-col rounded-t-xl bg-surface shadow-[0_-8px_40px_rgba(21,32,29,0.18)] md:inset-y-0 md:left-auto md:right-0 md:max-h-none md:w-[500px] md:rounded-none md:shadow-[-8px_0_40px_rgba(21,32,29,0.14)]"
      >
        <header className="flex items-start justify-between gap-3 border-b border-rule px-6 py-5">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 id="lead-drawer-title" className="text-[22px] font-semibold text-ink">
                {lead.id}
              </h2>
              <ActionBadge action={finalAction} />
            </div>
            <p className="mt-2 text-[15px] leading-relaxed text-ink-2">{score.reason}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-muted hover:bg-canvas hover:text-ink"
            aria-label="Close lead details"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 space-y-8 overflow-y-auto px-6 py-6">
          {score.override ? <p className="rounded-md bg-agent-soft px-3 py-2 text-[14px] text-agent">{OVERRIDE_LABEL}.</p> : null}
          {holdout ? (
            <p className="rounded-md bg-canvas px-3 py-2 text-[14px] text-ink-2">
              This lead is in the holdout, so nobody contacts it. Without the holdout the score would recommend{" "}
              <ActionBadge action={score.action} className="ml-1 align-middle" />
            </p>
          ) : null}

          <section className="space-y-3">
            <SubLabel>Lead</SubLabel>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-[14px]">
              {context.map(([k, v]) => (
                <div key={k} className="min-w-0">
                  <dt className="text-[13px] text-muted">{k}</dt>
                  <dd className="truncate text-ink">{v}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="space-y-5">
            <SubLabel>Why this score</SubLabel>
            <StackedScore title="Intent" sub={score.intent} weight={weights.intent} />
            <StackedScore title="App failure likelihood" sub={score.appFailure} weight={weights.appFailure} />
            <p className="border-t border-rule pt-3 text-[14px] text-ink-2">
              {score.intent.total} × {weights.intent.toFixed(2)} + {score.appFailure.total} × {weights.appFailure.toFixed(2)} ={" "}
              <span className="font-semibold text-ink">{score.opportunity.toFixed(1)}</span> estimated opportunity for a human to
              change the outcome
            </p>
          </section>

          <section className="space-y-2">
            <SubLabel>Suggested approach</SubLabel>
            <p className="text-[15px] leading-relaxed text-ink-2">{approach.summary}</p>
            {approach.steps.length > 0 ? (
              <ul className="list-disc space-y-1.5 pl-5 text-[15px] leading-relaxed text-ink-2 marker:text-muted">
                {approach.steps.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            ) : null}
          </section>

          {draft ? (
            <section className="space-y-2">
              <SubLabel>{draft.channel}</SubLabel>
              <div className="flex gap-3 rounded-md border-l-2 border-agent bg-canvas px-4 py-3">
                {draft.channel === "Call opener" ? (
                  <Phone className="mt-1 h-4 w-4 shrink-0 text-agent" aria-hidden />
                ) : (
                  <MessageSquareText className="mt-1 h-4 w-4 shrink-0 text-agent" aria-hidden />
                )}
                <p className="text-[15px] leading-relaxed text-ink">{draft.text}</p>
              </div>
            </section>
          ) : null}

          <p className="text-[13px] text-muted">Synthetic data. Illustrative only.</p>
        </div>
      </aside>
    </div>
  );
}
