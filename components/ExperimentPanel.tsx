"use client";

import { AlertTriangle, CheckCircle2, ChevronDown, CircleAlert, RotateCcw, Sigma, XCircle } from "lucide-react";
import { useState, type ReactNode } from "react";
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
import { aed, evidenceLabel, int, num1, pct, plainReason, type Evidence } from "@/lib/format";
import { RateChart } from "./RateChart";
import { Card, cn, SectionLabel, VERDICT_STYLE } from "./ui";

/* ------------------------------------------------------------------ */
/* Inputs                                                              */
/* ------------------------------------------------------------------ */

function Field({ spec, value, error, onChange, emphasise }: { spec: FieldSpec; value: string; error?: string; onChange: (v: string) => void; emphasise?: boolean }) {
  const id = `f-${spec.key}`;
  return (
    <div className="flex min-w-0 flex-col justify-end">
      <label htmlFor={id} className="mb-1 block text-xs leading-snug">
        <span className={emphasise ? "font-medium text-zinc-900" : "text-zinc-600"}>{spec.label}</span>
        {spec.hint ? <span className="text-zinc-400"> · {spec.hint}</span> : null}
      </label>
      <div
        className={cn(
          "flex h-9 items-center rounded-lg border bg-white focus-within:ring-2",
          error ? "border-red-400 focus-within:ring-red-100" : "border-zinc-200 focus-within:border-emerald-700 focus-within:ring-emerald-100",
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
          className="h-full w-full min-w-0 rounded-lg bg-transparent px-2.5 text-sm tabular-nums text-zinc-900 focus:outline-none"
        />
        {spec.unit ? <span className="pr-2.5 text-xs text-zinc-400">{spec.unit}</span> : null}
      </div>
      {error ? (
        <p id={`${id}-err`} className="mt-1 text-[11px] text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Results                                                             */
/* ------------------------------------------------------------------ */

const EVIDENCE_TONE: Record<Evidence["tone"], string> = {
  strong: "bg-emerald-50 text-emerald-900 ring-emerald-200",
  promising: "bg-amber-50 text-amber-900 ring-amber-200",
  weak: "bg-white/70 text-zinc-700 ring-zinc-200",
};

function EvidencePill({ p }: { p: number }) {
  const e = evidenceLabel(p);
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset", EVIDENCE_TONE[e.tone])}>
      {e.label}
    </span>
  );
}

function Tile({ label, value, sub, emphasise }: { label: string; value: ReactNode; sub?: ReactNode; emphasise?: boolean }) {
  return (
    <div className={cn("min-w-0 rounded-xl px-4 py-3", emphasise ? "bg-white ring-1 ring-zinc-300" : "bg-zinc-50")}>
      <div className="text-xs leading-snug text-zinc-500">{label}</div>
      <div className="mt-1 text-xl font-semibold tabular-nums tracking-tight text-zinc-900">{value}</div>
      {sub ? <div className="mt-0.5 text-[11px] leading-snug text-zinc-500">{sub}</div> : null}
    </div>
  );
}

const STATUS_ICON: Record<GuardrailStatus, ReactNode> = {
  pass: <CheckCircle2 className="h-4 w-4 text-emerald-700" aria-label="Pass" />,
  warn: <CircleAlert className="h-4 w-4 text-amber-600" aria-label="Warning" />,
  fail: <XCircle className="h-4 w-4 text-red-600" aria-label="Breached" />,
};

/** Guardrail detail rendered with the shared formatters (values come from lib results). */
function guardrailDetail(g: Guardrail, r: ExperimentResults, x: ExperimentInputs): string {
  switch (g.key) {
    case "cost":
      if (r.costStatus === "no_gmv") return "No incremental GMV · uneconomic";
      if (r.costStatus === "net_saving") return "Net cost saving vs control";
      return `${pct(r.costToServePct ?? 0)} (scale ≤ ${pct(VERDICT.scaleMaxCostToServePct)}, kill > ${pct(VERDICT.killMaxCostToServePct)})`;
    case "app":
      return r.appConvRelativeDropPct > 0
        ? `${pct(r.appConvRelativeDropPct)} relative drop vs holdout (max ${pct(x.maxAppDropPct)})`
        : `No drop vs holdout (max ${pct(x.maxAppDropPct)})`;
    case "quality":
      return `${x.quality.toFixed(1)} / 5 (min ${x.qualityThreshold.toFixed(1)})`;
    case "optout":
      return `${pct(x.optOutPct)} (max ${pct(x.maxOptOutPct)})`;
  }
}

function VerdictCard({ r, x }: { r: ExperimentResults; x: ExperimentInputs }) {
  const s = VERDICT_STYLE[r.verdict];
  return (
    <div className={cn("rounded-2xl p-5 ring-1 ring-inset sm:p-6", s.card)}>
      <div className="flex flex-wrap items-center gap-3">
        <span className={cn("rounded-lg px-3 py-1.5 text-lg font-bold tracking-wide sm:text-xl", s.chip)}>{r.verdict}</span>
        <EvidencePill p={r.pValue} />
      </div>
      <p className={cn("mt-3 text-base font-medium leading-relaxed sm:text-lg", s.text)}>{plainReason(r, x)}</p>
    </div>
  );
}

function Maths({ r, x }: { r: ExperimentResults; x: ExperimentInputs }) {
  const rows: [string, string][] = [
    ["p-value (two-sided, pooled z-test)", r.pValue < 0.001 ? "< 0.001" : r.pValue.toFixed(3)],
    ["z statistic", r.z.toFixed(2)],
    [`Significant at ${VERDICT.alpha}?`, r.significant ? "Yes" : "No"],
    ["Sample needed per arm (95% conf., 80% power)", r.sampleNeededPerArm !== null ? `≈ ${int(r.sampleNeededPerArm)}` : "No lift to detect"],
    ["Current sample (treatment / control)", `${int(x.treatmentN)} / ${int(x.controlN)}`],
  ];
  const tRate = x.treatmentRatePct / 100;
  const cRate = x.controlRatePct / 100;
  const formulas = [
    `Incremental bookings = ${int(x.treatmentN)} × (${tRate.toFixed(3)} − ${cRate.toFixed(3)}) = ${num1(r.incrementalBookings)}`,
    `Incremental GMV = ${num1(r.incrementalBookings)} × ${aed(x.aov)} = ${aed(r.incrementalGmv)}`,
    `Cost per lead = calls × ${aed(x.costPerCall)} + WhatsApps × AED ${x.costPerWa.toFixed(2)} → treatment AED ${r.costPerLeadT.toFixed(2)}, control AED ${r.costPerLeadC.toFixed(2)}`,
    `Incremental cost = ${int(x.treatmentN)} × (${r.costPerLeadT.toFixed(2)} − ${r.costPerLeadC.toFixed(2)}) = ${aed(r.incrementalCost)}`,
    r.costStatus === "pct"
      ? `Cost to serve = ${aed(r.incrementalCost)} ÷ ${aed(r.incrementalGmv)} = ${pct(r.costToServePct ?? 0)}`
      : r.costStatus === "net_saving"
        ? "Cost to serve: incremental cost ≤ 0 with positive GMV → net cost saving"
        : "Cost to serve: incremental GMV ≤ 0 → no percentage (uneconomic)",
    r.attributedCostPct !== null
      ? `If we credit every agent-touched booking = (${int(x.treatmentN)} × ${r.costPerLeadT.toFixed(2)}) ÷ (${num1(r.treatmentBookings)} × ${aed(x.aov)}) = ${pct(r.attributedCostPct)}`
      : "If we credit every agent-touched booking: no treatment bookings",
    "Sample size n = (z₀.₉₇₅·√(2p̄q̄) + z₀.₈·√(p₁q₁ + p₂q₂))² ÷ (p₁ − p₂)²",
  ];
  return (
    <div className="space-y-4 rounded-xl bg-zinc-50 p-4">
      <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-baseline justify-between gap-3">
            <dt className="text-zinc-500">{k}</dt>
            <dd className="shrink-0 font-medium tabular-nums text-zinc-900">{v}</dd>
          </div>
        ))}
      </dl>
      <ul className="space-y-1.5 font-mono text-[11px] leading-relaxed text-zinc-600 sm:text-xs">
        {formulas.map((f) => (
          <li key={f} className="break-words">
            {f}
          </li>
        ))}
      </ul>
      <p className="text-xs text-zinc-500">
        Approximate: normal approximation, with no correction for running three experiments or for checking results early.
      </p>
    </div>
  );
}

function Results({ def, r, x }: { def: ExperimentDefinition; r: ExperimentResults; x: ExperimentInputs }) {
  const [showMaths, setShowMaths] = useState(false);
  const costToServe =
    r.costStatus === "no_gmv" ? (
      <span className="text-base text-red-700">No incremental GMV · uneconomic</span>
    ) : r.costStatus === "net_saving" ? (
      <span className="text-emerald-800">Net cost saving</span>
    ) : (
      <span className={(r.costToServePct ?? 0) > VERDICT.killMaxCostToServePct ? "text-red-700" : undefined}>
        {pct(r.costToServePct ?? 0)}
      </span>
    );

  return (
    <div className="space-y-5">
      <VerdictCard r={r} x={x} />

      <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-3">
        <Tile
          label="Cost to serve on bookings agents caused"
          value={costToServe}
          sub={`Scale ≤ ${pct(VERDICT.scaleMaxCostToServePct)} · kill > ${pct(VERDICT.killMaxCostToServePct)}`}
          emphasise
        />
        <Tile
          label="If we credit every agent-touched booking"
          value={r.attributedCostPct !== null ? pct(r.attributedCostPct) : "n/a"}
          sub="Total treatment cost ÷ total treatment GMV"
        />
        <Tile
          label="Extra bookings caused"
          value={num1(r.incrementalBookings)}
          sub={`of ${num1(r.treatmentBookings)} treatment bookings${r.incrementalShare !== null && r.incrementalShare > 0 ? ` (${pct(r.incrementalShare * 100)})` : ""}`}
        />
        <Tile label="Extra GMV" value={aed(r.incrementalGmv)} sub="Booked, not yet delivered" />
        <Tile label="Extra contact cost" value={aed(r.incrementalCost)} sub={`AED ${r.costPerLeadT.toFixed(2)} vs ${r.costPerLeadC.toFixed(2)} per lead`} />
        <Tile
          label="Cost per extra booking"
          value={r.costPerIncrementalBooking === null ? "n/a" : r.costPerIncrementalBooking <= 0 ? "Saving" : aed(r.costPerIncrementalBooking)}
          sub={def.highlightCostPerIncBooking ? "Guardrail for this experiment" : undefined}
          emphasise={def.highlightCostPerIncBooking}
        />
        {def.highlightConnection ? (
          <Tile label="Connection rate" value={pct(x.connectionRatePct)} sub="Primary metric (informational here)" emphasise />
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl bg-zinc-50 p-4">
          <div className="text-xs text-zinc-500">Booking rate per assigned lead</div>
          <RateChart treatment={x.treatmentRatePct} control={x.controlRatePct} />
        </div>
        <div className="rounded-xl bg-zinc-50 p-4">
          <div className="mb-3 text-xs text-zinc-500">Guardrails</div>
          <ul className="space-y-3">
            {r.guardrails.map((g) => (
              <li key={g.key} className="flex items-start gap-2.5">
                <span className="mt-0.5">{STATUS_ICON[g.status]}</span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-zinc-900">{g.label}</span>
                  <span
                    className={cn(
                      "block text-xs",
                      g.status === "fail" ? "text-red-700" : g.status === "warn" ? "text-amber-700" : "text-zinc-500",
                    )}
                  >
                    {guardrailDetail(g, r, x)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div>
        <button
          type="button"
          onClick={() => setShowMaths((s) => !s)}
          aria-expanded={showMaths}
          className="inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-emerald-800 hover:bg-emerald-50"
        >
          <Sigma className="h-4 w-4" aria-hidden />
          {showMaths ? "Hide the maths" : "Show the maths"}
          <ChevronDown className={cn("h-4 w-4 transition-transform", showMaths && "rotate-180")} aria-hidden />
        </button>
        {showMaths ? (
          <div className="mt-2">
            <Maths r={r} x={x} />
          </div>
        ) : null}
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
  const [inputsOpen, setInputsOpen] = useState(false);
  const v = validateInputs(raw, def.hasOptOut);
  const values = v.ok ? v.values : null;
  const results = values ? computeResults(values, def.hasOptOut) : null;
  const errorCount = Object.keys(v.errors).length;
  const set = (k: InputKey, value: string) => onChange({ ...raw, [k]: value });

  return (
    <Card>
      <div className="px-5 pt-5 sm:px-6 sm:pt-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Experiment {def.number}</div>
            <h3 className="mt-0.5 text-lg font-semibold text-zinc-950 sm:text-xl">{def.title}</h3>
          </div>
          <button
            type="button"
            onClick={onReset}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Reset to preset
          </button>
        </div>
        <dl className="mt-3 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
          {(
            [
              ["Treatment", def.treatment],
              ["Control", def.control],
              ["Primary metric", def.primaryMetric],
              ["Guardrails", def.guardrailNote],
            ] as const
          ).map(([k, val]) => (
            <div key={k} className="flex gap-2">
              <dt className="w-28 shrink-0 text-zinc-500">{k}</dt>
              <dd className="min-w-0 text-zinc-800">{val}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,4fr)] lg:gap-8">
        <div>
          {results && values ? (
            <Results def={def} r={results} x={values} />
          ) : (
            <div className="flex min-h-48 flex-col items-center justify-center gap-2 rounded-2xl bg-red-50 p-6 text-center ring-1 ring-inset ring-red-200">
              <AlertTriangle className="h-5 w-5 text-red-600" aria-hidden />
              <p className="text-sm font-medium text-zinc-900">Fix the highlighted inputs to see results</p>
              <p className="text-xs text-zinc-500">Nothing is calculated from invalid assumptions.</p>
            </div>
          )}
        </div>

        <div className="lg:border-l lg:border-zinc-100 lg:pl-8">
          <button
            type="button"
            onClick={() => setInputsOpen((o) => !o)}
            aria-expanded={inputsOpen}
            className="flex w-full items-center justify-between rounded-xl bg-zinc-50 px-4 py-3 text-left text-sm font-semibold text-zinc-900 lg:hidden"
          >
            <span>
              Change the assumptions
              {errorCount > 0 ? <span className="ml-2 text-xs font-medium text-red-600">{errorCount} to fix</span> : null}
            </span>
            <ChevronDown className={cn("h-4 w-4 text-zinc-400 transition-transform", inputsOpen && "rotate-180")} aria-hidden />
          </button>
          <div className="mb-4 hidden text-sm font-semibold text-zinc-900 lg:block">Change the assumptions</div>
          <div className={cn("space-y-6 pt-4 lg:block lg:pt-0", inputsOpen ? "block" : "hidden")}>
            {FIELD_GROUPS.map((g) => {
              const fields = g.fields.filter((f) => !f.optOutOnly || def.hasOptOut);
              return (
                <fieldset key={g.title} className="space-y-3">
                  <legend className="mb-1">
                    <SectionLabel>{g.title}</SectionLabel>
                  </legend>
                  <div className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-2">
                    {fields.map((f) => (
                      <Field
                        key={f.key}
                        spec={f}
                        value={raw[f.key]}
                        error={v.errors[f.key]}
                        onChange={(val) => set(f.key, val)}
                        emphasise={f.key === "connectionRatePct" && def.highlightConnection}
                      />
                    ))}
                  </div>
                </fieldset>
              );
            })}
            <div className="space-y-1.5 text-xs leading-relaxed text-zinc-500">
              <p>Booking rates are per assigned lead, including leads the team never connected with.</p>
              <p>Bookings would be attributed at 1, 3 and 7 days.</p>
              <p>
                Experiments draw from non-holdout leads; treatment and control are randomised within each experiment. Sample sizes
                are projected volumes, not the 60 synthetic leads.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
