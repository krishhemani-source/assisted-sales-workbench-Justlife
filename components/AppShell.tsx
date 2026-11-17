"use client";

import type { FinalAction } from "@/lib/types";
import { ExperimentSimulator } from "./ExperimentSimulator";
import { Hero } from "./Hero";
import { LeadWorkbench } from "./LeadWorkbench";
import { useScoring } from "./useScoring";

export function AppShell() {
  const scoring = useScoring();

  const pickAction = (a: FinalAction) => {
    scoring.setActionFilter(scoring.actionFilter === a ? "all" : a);
    requestAnimationFrame(() => document.getElementById("lead-table")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  return (
    <>
      <Hero scoring={scoring} onPickAction={pickAction} />
      <div className="mt-20 sm:mt-28">
        <LeadWorkbench scoring={scoring} />
      </div>
      <div className="mt-20 sm:mt-28">
        <ExperimentSimulator />
      </div>
    </>
  );
}
