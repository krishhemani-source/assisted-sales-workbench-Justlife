"use client";

import { ArrowRight, MessageSquareText, Phone, Smartphone } from "lucide-react";
import type { ReactNode } from "react";
import { EXPERIMENTS, computeResults } from "@/lib/experiments";
import { pct } from "@/lib/format";
import type { Action } from "@/lib/types";
import type { Scoring, ScoredLead } from "./useScoring";
import { cn } from "./ui";

// Hero comparison uses Experiment 1's preset (live from lib/experiments.ts, not hard-coded numbers).
const EXP1 = EXPERIMENTS[0];
const EXP1_RESULT = computeResults(EXP1.preset, EXP1.hasOptOut);

const CARD_META: Record<Action, { title: string; icon: ReactNode }> = {
  AGENT_CALL: { title: "Call", icon: <Phone className="h-4 w-4" aria-hidden /> },
  WHATSAPP_NUDGE: { title: "WhatsApp", icon: <MessageSquareText className="h-4 w-4" aria-hidden /> },
  LEAVE_TO_APP: { title: "Leave to app", icon: <Smartphone className="h-4 w-4" aria-hidden /> },
};

function pickExample(rows: ScoredLead[], action: Action): ScoredLead | undefined {
  const pool = rows.filter((r) => r.finalAction === action);
  if (action === "AGENT_CALL") {
    // Show a scored call, not a callback override, so the example illustrates the rule.
    const scoredCalls = pool.filter((r) => !r.score.override);
    return [...(scoredCalls.length ? scoredCalls : pool)].sort((a, b) => b.score.opportunity - a.score.opportunity)[0];
  }
  if (action === "LEAVE_TO_APP") {
    // The story: the highest-intent customer we deliberately leave alone.
    return [...pool].sort((a, b) => b.score.intent.total - a.score.intent.total || b.score.opportunity - a.score.opportunity)[0];
  }
  return [...pool].sort((a, b) => b.score.opportunity - a.score.opportunity)[0];
}

export function Hero({ scoring, onPickAction }: { scoring: Scoring; onPickAction: (a: Action) => void }) {
  const attributed = EXP1_RESULT.attributedCostPct ?? 0;
  const incremental = EXP1_RESULT.costToServePct;

  return (
    <section className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center lg:gap-10">
        <div>
          <h2 className="text-3xl font-semibold leading-[1.1] tracking-tight text-zinc-950 sm:text-4xl lg:text-5xl">
            Not every high-intent customer needs a call.
          </h2>
          <p className="mt-3 max-w-xl text-base leading-relaxed text-zinc-600 sm:text-lg">
            This workbench finds where a human actually changes the outcome, and kills tests that only look good.
          </p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] ring-1 ring-zinc-950/[0.06] sm:p-6">
          <div className="text-xs font-medium text-zinc-500">Experiment 1 · Checkout recovery calls</div>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:gap-6">
            <div className="min-w-0">
              <div className="text-xs leading-snug text-zinc-500 sm:text-sm">
                Cost to serve if you credit every agent-touched booking
              </div>
              <div className="mt-2 text-4xl font-semibold tabular-nums tracking-tight text-zinc-900 sm:text-5xl">
                {pct(attributed)}
              </div>
              <span className="mt-2 inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-900 ring-1 ring-inset ring-emerald-200">
                Looks great
              </span>
            </div>
            <div className="min-w-0 border-l border-zinc-100 pl-4 sm:pl-6">
              <div className="text-xs leading-snug text-zinc-500 sm:text-sm">Cost to serve on bookings agents actually caused</div>
              <div className="mt-2 text-4xl font-semibold tabular-nums tracking-tight text-red-700 sm:text-5xl">
                {incremental !== null ? pct(incremental) : "n/a"}
              </div>
              <span className="mt-2 inline-flex rounded-full bg-red-700 px-2.5 py-1 text-xs font-semibold text-white">
                Verdict: {EXP1_RESULT.verdict}
              </span>
            </div>
          </div>
          <p className="mt-4 text-sm text-zinc-600">Same experiment. The difference is incrementality.</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {(Object.keys(CARD_META) as Action[]).map((action) => {
          const rows = scoring.scored.filter((r) => r.finalAction === action);
          const ex = pickExample(scoring.scored, action);
          const active = scoring.actionFilter === action;
          return (
            <button
              key={action}
              type="button"
              onClick={() => onPickAction(action)}
              aria-pressed={active}
              className={cn(
                "group flex flex-col rounded-2xl bg-white p-4 text-left shadow-[0_1px_2px_rgba(0,0,0,0.04)] ring-1 transition hover:ring-zinc-300",
                active ? "ring-2 ring-emerald-800" : "ring-zinc-950/[0.06]",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 text-sm font-semibold",
                    action === "AGENT_CALL" ? "text-emerald-800" : "text-zinc-900",
                  )}
                >
                  {CARD_META[action].icon}
                  {CARD_META[action].title}: {rows.length} leads
                </span>
                <ArrowRight className="h-4 w-4 text-zinc-300 transition group-hover:translate-x-0.5 group-hover:text-zinc-500" aria-hidden />
              </div>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                {ex ? (
                  <>
                    <span className="font-mono text-xs text-zinc-400">{ex.lead.id}</span> {ex.score.reason}
                  </>
                ) : (
                  "No leads in this band at the current settings."
                )}
              </p>
            </button>
          );
        })}
      </div>
      <p className="-mt-3 text-xs text-zinc-500">
        + {scoring.scored.filter((r) => r.holdout).length} in holdout (never contacted) ·{" "}
        {scoring.scored.length} leads in total
      </p>
    </section>
  );
}
