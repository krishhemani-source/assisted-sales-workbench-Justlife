"use client";

import { useState } from "react";
import { EXPERIMENTS, computeResults, toRaw, validateInputs, type RawInputs } from "@/lib/experiments";
import { ExperimentPanel } from "./ExperimentPanel";
import { cn, VERDICT_STYLE } from "./ui";

const initial = () => Object.fromEntries(EXPERIMENTS.map((e) => [e.id, toRaw(e.preset)])) as Record<string, RawInputs>;


export function ExperimentSimulator() {
  const [raw, setRaw] = useState<Record<string, RawInputs>>(initial);
  const [activeId, setActiveId] = useState(EXPERIMENTS[0].id);
  const active = EXPERIMENTS.find((e) => e.id === activeId) ?? EXPERIMENTS[0];

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <span className="font-medium">Simulated results from editable assumptions.</span> Hypotheses to test, not claims. Not
        observed data.
      </div>

      <div className="grid gap-2 sm:grid-cols-3" role="tablist" aria-label="Experiments">
        {EXPERIMENTS.map((e) => {
          const v = validateInputs(raw[e.id], e.hasOptOut);
          const verdict = v.ok ? computeResults(v.values, e.hasOptOut).verdict : null;
          const selected = e.id === activeId;
          return (
            <button
              key={e.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setActiveId(e.id)}
              className={cn(
                "flex items-start justify-between gap-3 rounded-xl border bg-white px-4 py-3 text-left transition-colors",
                selected ? "border-zinc-900 ring-1 ring-zinc-900" : "border-zinc-200 hover:border-zinc-300",
              )}
            >
              <span className="min-w-0">
                <span className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                  Experiment {e.number}
                </span>
                <span className="mt-0.5 block text-sm font-medium leading-snug text-zinc-900">{e.title}</span>
              </span>
              {verdict ? (
                <span
                  className={cn(
                    "shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ring-inset",
                    VERDICT_STYLE[verdict].chip,
                  )}
                >
                  {VERDICT_STYLE[verdict].label}
                </span>
              ) : (
                <span className="shrink-0 rounded-md bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500">Invalid</span>
              )}
            </button>
          );
        })}
      </div>

      <ExperimentPanel
        key={active.id}
        def={active}
        raw={raw[active.id]}
        onChange={(next) => setRaw((r) => ({ ...r, [active.id]: next }))}
        onReset={() => setRaw((r) => ({ ...r, [active.id]: toRaw(active.preset) }))}
      />
    </div>
  );
}
