"use client";

import { AlertTriangle, CheckCircle2, CircleAlert, RotateCcw, XCircle } from "lucide-react";
import type { ReactNode } from "react";
import { VERDICT } from "@/lib/config";
import {
  FIELD_GROUPS,
  computeResults,
  validateInputs,
  type ExperimentDefinition,
  type ExperimentInputs,
  type ExperimentResults,
  type FieldSpec,
  type Guardrail,
  type GuardrailStatus,
  type InputKey,
  type RawInputs,
} from "@/lib/experiments";
import { aed, evidenceLabel, int, num1, pct, plainReason } from "@/lib/format";
import { RateChart } from "./RateChart";
import { SplitBar } from "./SplitBar";
import { AnimatedNumber, cn, Disclosure, SubLabel, VERDICT_STYLE } from "./ui";

/* ------------------------------------------------------------------ */
/* Inputs                                                              */
/* ------------------------------------------------------------------ */

/** Turns the validator's terse error into an instruction that says what to type. */
function fixMessage(spec: FieldSpec, error: string): string {
  if (error === "Enter a number") return `Enter a number for ${spec.label.toLowerCase()}.`;
  switch (spec.kind) {
    case "count":
      return "Enter a whole number of 1 or more.";
    case "pct":
      return "Enter a percentage from 0 to 100.";
    case "money":
      return spec.key === "aov" ? "Enter an amount above 0." : "Enter 0 or more.";
    case "perLead":
      return "Enter 0 or more.";
    case "quality":
      return "Enter a score from 0 to 5.";
  }
}

function Field({ spec, value, error, onChange }: { spec: FieldSpec; value: string; error?: string; onChange: (v: string) => void }) {
  const id = `f-${spec.key}`;
  return (
    <div className="flex min-w-0 flex-col justify-end">
      <label htmlFor={id} className="mb-1 block text-[13px] leading-snug text-ink-2">
        {spec.label}
        {spec.hint ? <span className="text-muted">, {spec.hint}</span> : null}
      </label>
      <div
        className={cn(
          "flex h-10 items-center rounded-md border bg-surface",
          error ? "border-kill ring-2 ring-kill-soft" : "border-rule focus-within:border-agent",
        )}
      >
        <input
          id={id}
          type="number"
          inputMode="decimal"
          step="any"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-err` : undefined}
          className="h-full w-full min-w-0 rounded-md bg-transparent px-3 text-[15px] text-ink focus:outline-none"
        />
        {spec.unit ? <span className="pr-3 text-[13px] text-muted">{spec.unit}</span> : null}
      </div>
      {error ? (
        <p id={`${id}-err`} className="mt-1 text-[13px] text-kill">
          {fixMessage(spec, error)}
        </p>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Results                                                             */
/* ------------------------------------------------------------------ */

const STATUS_ICON: Record<GuardrailStatus, ReactNode> = {
  pass: <CheckCircle2 className="h-[18px] w-[18px] text-agent" aria-label="Passes" />,
  warn: <CircleAlert className="h-[18px] w-[18px] text-iterate" aria-label="Warning" />,
  fail: <XCircle className="h-[18px] w-[18px] text-kill" aria-label="Breached" />,
};

const COST_BANDS = `Scale at ${VERDICT.scaleMaxCostToServePct}% or below · ${VERDICT.scaleMaxCostToServePct}–${VERDICT.killMaxCostToServePct}% = iterate · above ${VERDICT.killMaxCostToServePct}% = kill`;

function guardrailDetail(g: Guardrail, r: ExperimentResults, x: ExperimentInputs): ReactNode {
  switch (g.key) {
    case "cost": {
      const value =
        r.costStatus === "no_gmv"
          ? "No incremental GMV, so it is uneconomic"
          : r.costStatus === "net_saving"
            ? "Net cost saving against control"
            : `${pct(r.costToServePct ?? 0)} of incremental GMV`;
      return (
        <>
          {value}
          <span className="mt-0.5 block text-muted">{COST_BANDS}</span>
        </>
      );
    }
    case "app":
      return r.appConvRelativeDropPct > 0
        ? `${pct(r.appConvRelativeDropPct)} relative drop against the holdout; the limit is ${pct(x.maxAppDropPct)}`
        : `No drop against the holdout; the limit is ${pct(x.maxAppDropPct)}`;
    case "quality":
      return `${x.quality.toFixed(1)} out of 5; the minimum is ${x.qualityThreshold.toFixed(1)}`;
    case "optout":
      return `${pct(x.optOutPct)}; the maximum is ${pct(x.maxOptOutPct)}`;
  }
}

function Figure({ label, value, emphasise }: { label: string; value: ReactNode; emphasise?: boolean }) {
  return (
    <div className="min-w-0 py-3">
      <div className={cn("text-[22px] font-semibold leading-tight", emphasise ? "text-agent" : "text-ink")}>{value}</div>
      <div className="mt-1 text-[13px] leading-snug text-muted">{label}</div>
    </div>
  );
}

function Results({ def, r, x }: { def: ExperimentDefinition; r: ExperimentResults; x: ExperimentInputs }) {
  const s = VERDICT_STYLE[r.verdict];
  const ev = evidenceLabel(r.pValue);
  const killedOnCost = r.costStatus === "pct" && (r.costToServePct ?? 0) > VERDICT.killMaxCostToServePct;

  return (
    <div className="space-y-10">
      {/* Verdict first and largest */}
      <div className={cn("border-l-4 pl-5 sm:pl-6", s.rule)}>
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <span className={cn("text-[44px] font-semibold leading-none tracking-[-0.02em] sm:text-[56px]", s.text)}>{s.word}</span>
          {r.verdict !== "ITERATE" ? <span className="text-[15px] text-muted">{ev.label}</span> : null}
        </div>
        <p className="mt-3 max-w-[68ch] text-[17px] leading-relaxed text-ink">{plainReason(r, x)}</p>
      </div>

      <dl className="grid max-w-[900px] gap-x-10 gap-y-3 text-[15px] sm:grid-cols-3">
        {(
          [
            ["Treatment", def.treatment],
            ["Control", def.control],
            ["Primary metric", def.primaryMetric],
          ] as const
        ).map(([k, val]) => (
          <div key={k}>
            <dt className="text-[13px] text-muted">{k}</dt>
            <dd className="text-ink">{val}</dd>
          </div>
        ))}
      </dl>

      {/* Same visual language as the hero */}
      <div>
        <p className="mb-3 text-[15px] text-ink-2">
          <span className="font-semibold text-ink">
            <AnimatedNumber value={r.treatmentBookings} format={num1} />
          </span>{" "}
          bookings in the treatment group of {int(x.treatmentN)} leads
        </p>
        <SplitBar
          total={r.treatmentBookings}
          caused={r.incrementalBookings}
          anywayLabel="Would have happened anyway"
          causedLabel="Caused by the treatment"
          size="md"
        />
        <div className="mt-6 grid grid-cols-2 gap-6 sm:gap-12">
          <div>
            <div className="text-[30px] font-semibold leading-none text-ink">
              {r.attributedCostPct !== null ? <AnimatedNumber value={r.attributedCostPct} format={pct} /> : "n/a"}
            </div>
            <p className="mt-1.5 text-[14px] leading-snug text-ink-2">cost to serve if every agent-touched booking counts</p>
          </div>
          <div>
            <div className={cn("text-[30px] font-semibold leading-none", killedOnCost ? "text-kill" : r.costStatus === "pct" ? "text-ink" : "text-agent")}>
              {r.costStatus === "pct" ? (
                <AnimatedNumber value={r.costToServePct ?? 0} format={pct} />
              ) : r.costStatus === "net_saving" ? (
                "Net saving"
              ) : (
                <span className="text-kill">None caused</span>
              )}
            </div>
            <p className="mt-1.5 text-[14px] leading-snug text-ink-2">
              {r.costStatus === "no_gmv" ? "no extra bookings, so the contact cost buys nothing" : "on bookings the treatment actually caused"}
            </p>
          </div>
        </div>
      </div>

      {/* Key figures as one ruled row */}
      <div className="grid grid-cols-2 gap-x-8 border-y border-rule py-2 sm:grid-cols-4">
        <Figure label="extra bookings caused" value={<AnimatedNumber value={r.incrementalBookings} format={num1} />} />
        <Figure label="extra GMV, booked not yet delivered" value={<AnimatedNumber value={r.incrementalGmv} format={aed} />} />
        <Figure label="extra contact cost" value={<AnimatedNumber value={r.incrementalCost} format={aed} />} />
        {def.highlightConnection ? (
          <Figure label="connection rate, this test's primary metric" value={pct(x.connectionRatePct)} emphasise />
        ) : (
          <Figure
            label={def.highlightCostPerIncBooking ? "per extra booking, this test's guardrail" : "per extra booking"}
            value={r.costPerIncrementalBooking === null ? "n/a" : r.costPerIncrementalBooking <= 0 ? "Saving" : aed(r.costPerIncrementalBooking)}
            emphasise={def.highlightCostPerIncBooking}
          />
        )}
      </div>

      {/* Guardrails */}
      <div>
        <SubLabel>Guardrails</SubLabel>
        <ul className="mt-3 divide-y divide-rule/70">
          {r.guardrails.map((g) => (
            <li key={g.key} className="flex items-start gap-3 py-3">
              <span className="mt-0.5">{STATUS_ICON[g.status]}</span>
              <span className="grid min-w-0 flex-1 gap-0.5 sm:grid-cols-[200px_minmax(0,1fr)] sm:gap-4">
                <span className="text-[15px] font-medium text-ink">{g.label}</span>
                <span className={cn("text-[14px]", g.status === "fail" ? "text-kill" : g.status === "warn" ? "text-iterate" : "text-ink-2")}>
                  {guardrailDetail(g, r, x)}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <Disclosure title="Show the maths" summary="p-value, z, sample size and every formula with this test's numbers.">
          <Maths r={r} x={x} />
        </Disclosure>
      </div>
    </div>
  );
}

function Maths({ r, x }: { r: ExperimentResults; x: ExperimentInputs }) {
  const rows: [string, string][] = [
    ["p-value, two-sided pooled z-test", r.pValue < 0.001 ? "below 0.001" : r.pValue.toFixed(3)],
    ["z statistic", r.z.toFixed(2)],
    [`Significant at ${VERDICT.alpha}`, r.significant ? "Yes" : "No"],
    ["Sample needed per arm, 95% confidence and 80% power", r.sampleNeededPerArm !== null ? `about ${int(r.sampleNeededPerArm)}` : "No lift to detect"],
    ["Current sample, treatment and control", `${int(x.treatmentN)} and ${int(x.controlN)}`],
  ];
  const tRate = x.treatmentRatePct / 100;
  const cRate = x.controlRatePct / 100;
  const formulas = [
    `Incremental bookings = ${int(x.treatmentN)} × (${tRate.toFixed(3)} − ${cRate.toFixed(3)}) = ${num1(r.incrementalBookings)}`,
    `Incremental GMV = ${num1(r.incrementalBookings)} × ${aed(x.aov)} = ${aed(r.incrementalGmv)}`,
    `Cost per lead = calls × ${aed(x.costPerCall)} + WhatsApps × AED ${x.costPerWa.toFixed(2)}, giving AED ${r.costPerLeadT.toFixed(2)} for treatment and AED ${r.costPerLeadC.toFixed(2)} for control`,
    `Incremental cost = ${int(x.treatmentN)} × (${r.costPerLeadT.toFixed(2)} − ${r.costPerLeadC.toFixed(2)}) = ${aed(r.incrementalCost)}`,
    r.costStatus === "pct"
      ? `Cost to serve = ${aed(r.incrementalCost)} ÷ ${aed(r.incrementalGmv)} = ${pct(r.costToServePct ?? 0)}`
      : r.costStatus === "net_saving"
        ? "Cost to serve: incremental cost is zero or less with positive GMV, so it is a net saving"
        : "Cost to serve: incremental GMV is zero or less, so no percentage is shown",
    r.attributedCostPct !== null
      ? `If every agent-touched booking counts = (${int(x.treatmentN)} × ${r.costPerLeadT.toFixed(2)}) ÷ (${num1(r.treatmentBookings)} × ${aed(x.aov)}) = ${pct(r.attributedCostPct)}`
      : "If every agent-touched booking counts: there are no treatment bookings",
    "Sample size n = (z₀.₉₇₅ √(2p̄q̄) + z₀.₈ √(p₁q₁ + p₂q₂))² ÷ (p₁ − p₂)²",
  ];
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="space-y-5">
        <dl className="divide-y divide-rule/70 text-[14px]">
          {rows.map(([k, v]) => (
            <div key={k} className="flex items-baseline justify-between gap-4 py-2">
              <dt className="text-ink-2">{k}</dt>
              <dd className="shrink-0 font-semibold text-ink">{v}</dd>
            </div>
          ))}
        </dl>
        <ol className="list-decimal space-y-1.5 pl-5 text-[14px] leading-relaxed text-ink-2 marker:text-muted">
          {formulas.map((f) => (
            <li key={f} className="break-words">
              {f}
            </li>
          ))}
        </ol>
        <p className="text-[13px] text-muted">
          Approximate. Uses a normal approximation, with no correction for running three experiments or for checking results
          early.
        </p>
      </div>
      <div>
        <div className="text-[13px] text-muted">Booking rate per assigned lead</div>
        <RateChart treatment={x.treatmentRatePct} control={x.controlRatePct} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Panel                                                               */
/* ------------------------------------------------------------------ */

export function ExperimentPanel({
  def,
  raw,
  onChange,
  onReset,
}: {
  def: ExperimentDefinition;
  raw: RawInputs;
  onChange: (next: RawInputs) => void;
  onReset: () => void;
}) {
  const v = validateInputs(raw, def.hasOptOut);
  const values = v.ok ? v.values : null;
  const results = values ? computeResults(values, def.hasOptOut) : null;
  const errorCount = Object.keys(v.errors).length;
  const set = (k: InputKey, value: string) => onChange({ ...raw, [k]: value });

  return (
    <div className="space-y-8">
      <h3 className="text-[20px] font-semibold leading-snug text-ink sm:hidden">{def.title}</h3>
      {results && values ? (
        <Results def={def} r={results} x={values} />
      ) : (
        <div className="flex items-start gap-3 border-l-4 border-kill py-2 pl-5">
          <AlertTriangle className="mt-1 h-5 w-5 shrink-0 text-kill" aria-hidden />
          <div>
            <p className="text-[17px] font-semibold text-ink">
              {errorCount === 1 ? "One assumption needs fixing" : `${errorCount} assumptions need fixing`} before there is a verdict.
            </p>
            <p className="mt-1 text-[15px] text-ink-2">Nothing is calculated from invalid inputs. The fields to fix are marked in red below.</p>
          </div>
        </div>
      )}

      <Disclosure
        title="Change the assumptions"
        summary={errorCount > 0 ? <span className="text-kill">{errorCount} to fix</span> : "Sample sizes, booking rates, contact costs and guardrail limits."}
        defaultOpen={errorCount > 0}
      >
        <div className="space-y-8">
          <div className="grid gap-8 lg:grid-cols-3">
            {FIELD_GROUPS.map((g) => {
              const fields = g.fields.filter((f) => !f.optOutOnly || def.hasOptOut);
              return (
                <fieldset key={g.title} className="min-w-0 space-y-3">
                  <legend className="mb-2 text-[15px] font-semibold text-ink">{g.title}</legend>
                  <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2">
                    {fields.map((f) => (
                      <Field key={f.key} spec={f} value={raw[f.key]} error={v.errors[f.key]} onChange={(val) => set(f.key, val)} />
                    ))}
                  </div>
                </fieldset>
              );
            })}
          </div>
          <div className="flex flex-col gap-4 border-t border-rule pt-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-[70ch] space-y-1 text-[13px] leading-relaxed text-muted">
              <p>Booking rates are per assigned lead, including leads the team never reached. Bookings would be attributed at 1, 3 and 7 days.</p>
              <p>
                Experiments draw from leads outside the holdout, with treatment and control randomised within each experiment. Sample
                sizes are projected volumes, not the 60 synthetic leads.
              </p>
            </div>
            <button
              type="button"
              onClick={onReset}
              className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-md border border-rule bg-surface px-3 py-1.5 text-[13px] font-medium text-ink hover:border-ink/30"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Reset to preset
            </button>
          </div>
        </div>
      </Disclosure>
    </div>
  );
}
