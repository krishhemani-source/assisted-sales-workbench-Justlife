"use client";

import { EXPERIMENTS, computeResults } from "@/lib/experiments";
import { pct } from "@/lib/format";
import type { FinalAction } from "@/lib/types";
import { SplitBar } from "./SplitBar";
import type { Scoring, ScoredLead } from "./useScoring";
import { cn } from "./ui";

// Live from Experiment 1's preset in lib/experiments.ts; nothing here is hard-coded.
const EXP1 = EXPERIMENTS[0];
const R1 = computeResults(EXP1.preset, EXP1.hasOptOut);

const SUMMARY: { action: FinalAction; label: string }[] = [
  { action: "AGENT_CALL", label: "agent call" },
  { action: "WHATSAPP_NUDGE", label: "WhatsApp nudge" },
  { action: "LEAVE_TO_APP", label: "leave to app" },
];

function pickExample(rows: ScoredLead[], action: FinalAction): ScoredLead | undefined {
  const pool = rows.filter((r) => r.finalAction === action);
  if (action === "AGENT_CALL") {
    const scored = pool.filter((r) => !r.score.override);
    return [...(scored.length ? scored : pool)].sort((a, b) => b.score.opportunity - a.score.opportunity)[0];
  }
  if (action === "LEAVE_TO_APP") {
    // The story: the highest-intent customer we deliberately leave alone.
    return [...pool].sort((a, b) => b.score.intent.total - a.score.intent.total || b.score.opportunity - a.score.opportunity)[0];
  }
  return [...pool].sort((a, b) => b.score.opportunity - a.score.opportunity)[0];
}

export function Hero({ scoring, onPickAction }: { scoring: Scoring; onPickAction: (a: FinalAction) => void }) {
  const holdoutCount = scoring.scored.filter((r) => r.holdout).length;

  return (
    <section aria-labelledby="hero-title">
      <h2 id="hero-title" className="max-w-[18ch] text-balance text-[36px] font-semibold leading-[1.05] tracking-[-0.02em] text-ink sm:text-[52px]">
        Not every high-intent customer needs a call.
      </h2>
      <p className="mt-4 max-w-[60ch] text-[17px] leading-relaxed text-ink-2">
        This workbench finds where a human actually changes the outcome, and kills tests that only look good.
      </p>

      <div className="mt-10 sm:mt-12">
        <p className="mb-3 text-[15px] text-ink-2">
          Experiment 1, checkout recovery calls: <span className="font-semibold text-ink">{Math.round(R1.treatmentBookings)}</span>{" "}
          bookings in the treatment group
        </p>
        <SplitBar total={R1.treatmentBookings} caused={R1.incrementalBookings} intro />

        <div className="mt-8 grid grid-cols-2 gap-6 sm:gap-12">
          <div className="max-w-[30ch]">
            <div className="text-[36px] font-semibold leading-none tracking-[-0.02em] text-ink sm:text-[52px]">
              {pct(R1.attributedCostPct ?? 0)}
            </div>
            <p className="mt-2 text-[14px] leading-snug text-ink-2 sm:text-[15px]">
              cost to serve if every agent-touched booking counts
            </p>
          </div>
          <div className="max-w-[30ch]">
            <div className="text-[36px] font-semibold leading-none tracking-[-0.02em] text-kill sm:text-[52px]">
              {R1.costToServePct !== null ? pct(R1.costToServePct) : "n/a"}
            </div>
            <p className="mt-2 text-[14px] leading-snug text-ink-2 sm:text-[15px]">
              on bookings agents actually caused, so the verdict is{" "}
              <span className="font-semibold text-kill">{R1.verdict === "KILL" ? "kill" : R1.verdict.toLowerCase()}</span>
            </p>
          </div>
        </div>
        <p className="mt-6 text-[15px] font-medium text-ink">Same experiment. The difference is incrementality.</p>
      </div>

      {/* Quiet horizontal summary of today's recommendations */}
      <div className="mt-12 border-t border-ink/80 sm:mt-14">
        <div className="grid grid-cols-1 divide-y divide-rule sm:grid-cols-4 sm:gap-x-8 sm:divide-y-0">
          {SUMMARY.map(({ action, label }) => {
            const count = scoring.scored.filter((r) => r.finalAction === action).length;
            const ex = pickExample(scoring.scored, action);
            const active = scoring.actionFilter === action;
            return (
              <button
                key={action}
                type="button"
                onClick={() => onPickAction(action)}
                aria-pressed={active}
                className={cn(
                  "group py-4 text-left sm:py-5",
                  active ? "bg-agent-soft/60" : "hover:bg-surface/70",
                )}
              >
                <div className="flex items-baseline gap-2">
                  <span className={cn("text-[30px] font-semibold leading-none", action === "AGENT_CALL" ? "text-agent" : "text-ink")}>
                    {count}
                  </span>
                  <span className="text-[15px] font-medium text-ink group-hover:underline group-hover:underline-offset-4">{label}</span>
                </div>
                <p className="mt-2 line-clamp-3 text-[13px] leading-relaxed text-muted">{ex ? ex.score.reason : "None at the current settings."}</p>
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => onPickAction("HOLDOUT")}
            aria-pressed={scoring.actionFilter === "HOLDOUT"}
            className={cn(
              "group py-4 text-left sm:py-5",
              scoring.actionFilter === "HOLDOUT" ? "bg-agent-soft/60" : "hover:bg-surface/70",
            )}
          >
            <div className="flex items-baseline gap-2">
              <span className="text-[30px] font-semibold leading-none text-muted">{holdoutCount}</span>
              <span className="text-[15px] font-medium text-ink group-hover:underline group-hover:underline-offset-4">in holdout</span>
            </div>
            <p className="mt-2 text-[13px] leading-relaxed text-muted">
              Never contacted, so we can measure what the channel adds. {scoring.scored.length} leads in total.
            </p>
          </button>
        </div>
      </div>
    </section>
  );
}
