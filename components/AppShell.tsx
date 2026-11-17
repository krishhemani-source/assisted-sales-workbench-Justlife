"use client";

import { FlaskConical, ListChecks } from "lucide-react";
import { useState } from "react";
import { ExperimentSimulator } from "./ExperimentSimulator";
import { LeadWorkbench } from "./LeadWorkbench";
import { cn } from "./ui";

const TABS = [
  { id: "leads", label: "Lead Workbench", icon: ListChecks },
  { id: "experiments", label: "Experiment Simulator", icon: FlaskConical },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function AppShell() {
  const [tab, setTab] = useState<TabId>("leads");
  return (
    <div>
      <div className="mb-5 flex gap-1 border-b border-zinc-200" role="tablist" aria-label="Workflows">
        {TABS.map((t) => {
          const Icon = t.icon;
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
                "-mb-px inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-2.5 py-2.5 text-sm font-medium transition-colors sm:px-3",
                active ? "border-zinc-900 text-zinc-900" : "border-transparent text-zinc-500 hover:text-zinc-800",
              )}
            >
              <Icon className="hidden h-4 w-4 sm:block" aria-hidden />
              {t.label}
            </button>
          );
        })}
      </div>
      {/* Both stay mounted so edits survive tab switches. */}
      <div id="panel-leads" role="tabpanel" aria-labelledby="tab-leads" hidden={tab !== "leads"}>
        <LeadWorkbench />
      </div>
      <div id="panel-experiments" role="tabpanel" aria-labelledby="tab-experiments" hidden={tab !== "experiments"}>
        <ExperimentSimulator />
      </div>
    </div>
  );
}
