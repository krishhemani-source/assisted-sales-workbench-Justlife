"use client";

import { useState } from "react";
import { EXPERIMENTS, computeResults, toRaw, validateInputs, type RawInputs } from "@/lib/experiments";
import { ExperimentPanel } from "./ExperimentPanel";
import { cn, SectionHeading, VERDICT_STYLE } from "./ui";

const initial = () => Object.fromEntries(EXPERIMENTS.map((e) => [e.id, toRaw(e.preset)])) as Record<string, RawInputs>;

export function ExperimentSimulator() {
  const [raw, setRaw] = useState<Record<string, RawInputs>>(initial);
  const [activeId, setActiveId] = useState(EXPERIMENTS[0].id);
  const active = EXPERIMENTS.find((e) => e.id === activeId) ?? EXPERIMENTS[0];

  return (
    <section aria-labelledby="sim-title" className="space-y-6">
      <SectionHeading id="sim-title" title="Experiment simulator">
        Three tests the team could run next, judged on bookings agents cause, not bookings they touch. These are simulated
        results from editable assumptions: hypotheses to test, not observed data.
      </SectionHeading>

      <div role="tablist" aria-label="Experiments" className="grid grid-cols-3 border-y border-rule">
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
                "relative py-4 pr-3 text-left sm:pr-6",
                selected ? "text-ink" : "text-muted hover:text-ink",
              )}
            >
              {selected ? <span className="absolute -top-px left-0 right-3 h-[3px] bg-ink sm:right-6" aria-hidden /> : null}
              <span className="block text-[13px]">Experiment {e.number}</span>
              <span className="mt-0.5 hidden text-[15px] font-semibold leading-snug sm:block">{e.title}</span>
              <span className={cn("mt-1.5 block text-[14px] font-semibold", verdict ? VERDICT_STYLE[verdict].text : "text-kill")}>
                {verdict ? VERDICT_STYLE[verdict].word : "Needs fixing"}
              </span>
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
    </section>
  );
}
