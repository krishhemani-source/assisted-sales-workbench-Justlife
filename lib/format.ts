/**
 * Presentation helpers only. No scoring, holdout, experiment or stats logic lives here:
 * these functions read results produced by lib/experiments.ts and phrase them for people.
 */
import { VERDICT } from "./config";
import type { ExperimentInputs, ExperimentResults } from "./experiments";

/** "AED 2,200" / "−AED 375". Always whole dirhams with thousands separators. */
export function aed(n: number): string {
  const v = Math.round(n);
  return `${v < 0 ? "−" : ""}AED ${Math.abs(v).toLocaleString("en-US")}`;
}

/** Percent to exactly one decimal: "73.3%". */
export function pct(n: number): string {
  return `${n.toFixed(1)}%`;
}

export function int(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

/** One decimal, dropping a trailing ".0" for counts like bookings (12, 7.5). */
export function num1(n: number): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: 1 });
}

export type Evidence = { label: string; tone: "strong" | "promising" | "weak" };

/** Plain-language evidence label for a two-sided p-value. */
export function evidenceLabel(p: number): Evidence {
  if (p < 0.05) return { label: "Strong evidence", tone: "strong" };
  if (p <= 0.2) return { label: "Promising, needs more data", tone: "promising" };
  return { label: "Not enough evidence yet", tone: "weak" };
}

/** One sentence naming the deciding factor behind the verdict. */
export function plainReason(r: ExperimentResults, x: ExperimentInputs): string {
  if (r.verdict === "KILL") {
    const failed = r.guardrails.filter((g) => g.status === "fail");
    const more = failed.length > 1 ? ` (${failed.length - 1} other guardrail${failed.length > 2 ? "s" : ""} also breached.)` : "";
    const first = failed[0];
    let s: string;
    switch (first?.key) {
      case "cost":
        s =
          r.costStatus === "no_gmv"
            ? "Treatment did not beat control, so there are no extra bookings to pay for the contact cost."
            : `Most of these customers would have booked anyway: ${aed(r.incrementalCost)} of contact cost created only ${aed(r.incrementalGmv)} of extra bookings (${pct(r.costToServePct ?? 0)} cost to serve, ceiling ${VERDICT.killMaxCostToServePct}%).`;
        break;
      case "app":
        s = `Contact is pulling customers away from the app: app conversion fell ${pct(r.appConvRelativeDropPct)} relative to holdout (limit ${pct(x.maxAppDropPct)}).`;
        break;
      case "quality":
        s = `Conversations are not good enough: quality ${x.quality.toFixed(1)} / 5 is below the ${x.qualityThreshold.toFixed(1)} bar.`;
        break;
      case "optout":
        s = `Customers are pushing back: ${pct(x.optOutPct)} opted out or complained (limit ${pct(x.maxOptOutPct)}).`;
        break;
      default:
        s = "A guardrail is breached.";
    }
    return s + more;
  }
  if (r.verdict === "SCALE") {
    const cost = r.costStatus === "net_saving" ? "while costing less than control" : `at ${pct(r.costToServePct ?? 0)} cost to serve`;
    return `Agents created ${num1(r.incrementalBookings)} extra bookings (${aed(r.incrementalGmv)}) ${cost}, with strong evidence and every guardrail passing.`;
  }
  // ITERATE
  const parts: string[] = [];
  if (!r.significant) {
    const ev = evidenceLabel(r.pValue).label.toLowerCase();
    const need = r.sampleNeededPerArm !== null ? `; it needs about ${int(r.sampleNeededPerArm)} leads per arm to confirm` : "";
    parts.push(`The lift is positive but there is ${ev.startsWith("promising") ? "only promising evidence" : "not enough evidence yet"}${need}`);
  }
  if (r.costStatus === "net_saving") parts.push("it already costs less than the control process");
  if (r.costStatus === "pct" && (r.costToServePct ?? 0) > VERDICT.scaleMaxCostToServePct) {
    parts.push(`cost to serve is ${pct(r.costToServePct ?? 0)}, so try a cheaper channel or fewer attempts`);
  }
  const s = parts.join(", and ");
  return s.charAt(0).toUpperCase() + s.slice(1) + ".";
}
