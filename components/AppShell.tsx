"use client";

import { useState } from "react";
import type { Action } from "@/lib/types";
import { ExperimentSimulator } from "./ExperimentSimulator";
import { Hero } from "./Hero";
import { LeadWorkbench } from "./LeadWorkbench";
import { useScoring } from "./useScoring";
import { cn } from "./ui";

const TABS = [
  { id: "leads", label: "Lead Workbench" },
  { id: "experiments", label: "Experiment Simulator" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function AppShell() {
  const scoring = useScoring();
  const [tab, setTab] = useState<TabId>("leads");

  const pickAction = (a: Action) => {
    scoring.setActionFilter(scoring.actionFilter === a ? "all" : a);
    setTab("leads");
    requestAnimationFrame(() => document.getElementById("lead-table")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  return (
    <div className="space-y-10 sm:space-y-12">
      <Hero scoring={scoring} onPickAction={pickAction} />

      <div>
        <div className="mb-5 flex gap-6 border-b border-zinc-200" role="tablist" aria-label="Workflows">
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                id={`tab-${t.id}`}
                aria-selected={active}
                aria-controls={`panel-${t.id}`}
                onClick={() => setTab(t.id)}
                className={cn(
                  "-mb-px whitespace-nowrap border-b-2 pb-3 text-sm font-semibold transition-colors sm:text-base",
                  active ? "border-emerald-800 text-zinc-950" : "border-transparent text-zinc-500 hover:text-zinc-800",
                )}
              >
                {t.label}
              </button>
            );
          })}
        </div>
        {/* Both stay mounted so edits survive tab switches. */}
        <div id="panel-leads" role="tabpanel" aria-labelledby="tab-leads" hidden={tab !== "leads"}>
          <LeadWorkbench scoring={scoring} />
        </div>
        <div id="panel-experiments" role="tabpanel" aria-labelledby="tab-experiments" hidden={tab !== "experiments"}>
          <ExperimentSimulator />
        </div>
      </div>
    </div>
  );
}
