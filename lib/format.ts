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

/** One or two plain sentences naming the deciding factor behind the verdict. */
export function plainReason(r: ExperimentResults, x: ExperimentInputs): string {
  const limit = `${VERDICT.scaleMaxCostToServePct}%`;
  if (r.verdict === "KILL") {
    const failed = r.guardrails.filter((g) => g.status === "fail");
    const more = failed.length > 1 ? ` ${failed.length - 1} other guardrail${failed.length > 2 ? "s are" : " is"} also breached.` : "";
    const first = failed[0];
    switch (first?.key) {
      case "cost":
        if (r.costStatus === "no_gmv") {
          return `Killed on cost, regardless of evidence. The treatment did not beat control, so there are no extra bookings to pay for the contact cost.${more}`;
        }
        return `Killed on cost, regardless of evidence. ${aed(r.incrementalCost)} of contact cost created only ${aed(r.incrementalGmv)} of extra bookings: ${pct(r.costToServePct ?? 0)} cost to serve against a ${limit} limit. Most of these customers would have booked anyway.${more}`;
      case "app":
        return `Killed on a guardrail, regardless of evidence. App conversion fell ${pct(r.appConvRelativeDropPct)} relative to the holdout, beyond the ${pct(x.maxAppDropPct)} limit, so contact is pulling customers away from the app.${more}`;
      case "quality":
        return `Killed on a guardrail, regardless of evidence. Conversation quality of ${x.quality.toFixed(1)} out of 5 is below the ${x.qualityThreshold.toFixed(1)} bar.${more}`;
      case "optout":
        return `Killed on a guardrail, regardless of evidence. ${pct(x.optOutPct)} of customers opted out or complained, above the ${pct(x.maxOptOutPct)} limit.${more}`;
      default:
        return "Killed: a guardrail is breached.";
    }
  }
  if (r.verdict === "SCALE") {
    const cost =
      r.costStatus === "net_saving"
        ? "while costing less than the current process"
        : `at ${pct(r.costToServePct ?? 0)} cost to serve, inside the ${limit} limit`;
    return `Agents created ${num1(r.incrementalBookings)} extra bookings worth ${aed(r.incrementalGmv)} ${cost}. The evidence is strong and every guardrail passes.`;
  }
  // ITERATE
  const parts: string[] = [];
  if (r.costStatus === "net_saving") parts.push("It already costs less than the current process");
  if (r.costStatus === "pct" && (r.costToServePct ?? 0) > VERDICT.scaleMaxCostToServePct) {
    parts.push(
      `Cost to serve is ${pct(r.costToServePct ?? 0)}, above the ${limit} limit but below the ${VERDICT.killMaxCostToServePct}% kill line, so try a cheaper channel or fewer attempts`,
    );
  }
  if (!r.significant) {
    const ev = evidenceLabel(r.pValue).tone === "promising" ? "the evidence is promising but not yet strong" : "there is not enough evidence yet";
    const need = r.sampleNeededPerArm !== null ? `; about ${int(r.sampleNeededPerArm)} leads per arm would settle it` : "";
    parts.push(`${parts.length ? "but " : "The lift is positive but "}${ev}${need}`);
  }
  return parts.join(", ") + ".";
}
