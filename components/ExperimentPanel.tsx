"use client";

import { AlertTriangle, CheckCircle2, CircleAlert, RotateCcw, XCircle } from "lucide-react";
import type { ReactNode } from "react";
import { VERDICT } from "@/lib/config";
import {
  FIELD_GROUPS,
  computeResults,
  validateInputs,
  type ExperimentDefinition,
  type ExperimentResults,
  type FieldSpec,
  type GuardrailStatus,
  type InputKey,
  type RawInputs,
} from "@/lib/experiments";
import { RateChart } from "./RateChart";
import { Card, cn, SectionLabel, VERDICT_STYLE } from "./ui";

const aed = (n: number) => `${n < 0 ? "−" : ""}AED ${Math.abs(Math.round(n)).toLocaleString("en-US")}`;
const num = (n: number, d = 1) => n.toLocaleString("en-US", { maximumFractionDigits: d });

function Field({
  spec,
  value,
  error,
  onChange,
  emphasise,
}: {
  spec: FieldSpec;
  value: string;
  error?: string;
  onChange: (v: string) => void;
  emphasise?: boolean;
}) {
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
          error ? "border-red-400 focus-within:ring-red-100" : "border-zinc-300 focus-within:border-zinc-500 focus-within:ring-zinc-200",
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

function Metric({ label, value, sub, emphasise }: { label: string; value: ReactNode; sub?: ReactNode; emphasise?: boolean }) {
  return (
    <div className={cn("min-w-0 rounded-lg border px-3 py-2.5", emphasise ? "border-zinc-400 bg-zinc-50" : "border-zinc-200")}>
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="mt-0.5 text-lg font-semibold tabular-nums text-zinc-900">{value}</div>
      {sub ? <div className="mt-0.5 text-[11px] leading-snug text-zinc-500">{sub}</div> : null}
    </div>
  );
}

const STATUS_ICON: Record<GuardrailStatus, ReactNode> = {
  pass: <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-label="Pass" />,
  warn: <CircleAlert className="h-4 w-4 text-amber-600" aria-label="Warning" />,
  fail: <XCircle className="h-4 w-4 text-red-600" aria-label="Fail" />,
};

function VerdictCard({ r }: { r: ExperimentResults }) {
  const s = VERDICT_STYLE[r.verdict];
  return (
    <div className={cn("rounded-xl border p-4", s.card)}>
      <div className="flex items-center gap-2">
        <span className={cn("rounded-md px-2 py-0.5 text-xs font-bold tracking-wide ring-1 ring-inset", s.chip)}>
          {r.verdict}
        </span>
        <span className="text-sm font-semibold text-zinc-900">{r.headline}</span>
      </div>
      <ul className="mt-2.5 space-y-1.5 text-sm leading-relaxed text-zinc-700">
        {r.reasons.map((x) => (
          <li key={x} className="flex gap-2">
            <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-zinc-400" aria-hidden />
            <span>{x}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Results({ def, r, rates }: { def: ExperimentDefinition; r: ExperimentResults; rates: { t: number; c: number; conn: number } }) {
  const costToServe =
    r.costStatus === "no_gmv" ? (
      <span className="text-base text-red-700">No incremental GMV · uneconomic</span>
    ) : r.costStatus === "net_saving" ? (
      <span className="text-emerald-700">Net cost saving</span>
    ) : (
      `${num(r.costToServePct as number)}%`
    );

  return (
    <div className="space-y-4">
      <VerdictCard r={r} />

      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="rounded-lg border border-zinc-200 p-3">
          <div className="text-xs text-zinc-500">Booking rate per assigned lead</div>
          <RateChart treatment={rates.t} control={rates.c} />
        </div>
        <div className="rounded-lg border border-zinc-200 p-3">
          <div className="mb-2 text-xs text-zinc-500">Guardrails</div>
          <ul className="space-y-2.5">
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
                    {g.detail}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-3">
        <Metric
          label="Incremental bookings"
          value={num(r.incrementalBookings)}
          sub={`of ${num(r.treatmentBookings)} treatment bookings${r.incrementalShare !== null && r.incrementalShare > 0 ? ` (${num(r.incrementalShare * 100, 0)}%)` : ""}`}
        />
        <Metric label="Incremental GMV" value={aed(r.incrementalGmv)} sub="Booked, not yet delivered" />
        <Metric
          label="Incremental cost"
          value={aed(r.incrementalCost)}
          sub={`AED ${num(r.costPerLeadT, 2)} vs ${num(r.costPerLeadC, 2)} per lead`}
        />
        <Metric
          label="Cost to serve (incremental)"
          value={costToServe}
          sub={`Scale ≤ ${VERDICT.scaleMaxCostToServePct}% · kill > ${VERDICT.killMaxCostToServePct}%`}
          emphasise
        />
        <Metric
          label="Attributed basis, less strict"
          value={r.attributedCostPct !== null ? `${num(r.attributedCostPct)}%` : "—"}
          sub="Total treatment cost ÷ total treatment GMV"
        />
        <Metric
          label="Cost per incremental booking"
          value={
            r.costPerIncrementalBooking === null
              ? "—"
              : r.costPerIncrementalBooking <= 0
                ? "Saving"
                : aed(r.costPerIncrementalBooking)
          }
          sub={def.highlightCostPerIncBooking ? "Guardrail for this experiment" : undefined}
          emphasise={def.highlightCostPerIncBooking}
        />
        <Metric
          label="p-value (two-sided)"
          value={r.pValue < 0.001 ? "< 0.001" : r.pValue.toFixed(3)}
          sub={`z = ${r.z.toFixed(2)} · ${r.significant ? `significant at ${VERDICT.alpha}` : "not significant"} · approx.`}
        />
        <Metric
          label="Sample needed per arm"
          value={r.sampleNeededPerArm !== null ? `≈ ${r.sampleNeededPerArm.toLocaleString("en-US")}` : "—"}
          sub={r.sampleNeededPerArm !== null ? "95% confidence, 80% power · approx." : "No lift to detect"}
        />
        {def.highlightConnection ? (
          <Metric label="Connection rate" value={`${num(rates.conn)}%`} sub="Primary metric (informational here)" emphasise />
        ) : null}
      </div>

      {r.costStatus === "pct" && r.attributedCostPct !== null && r.costToServePct !== null ? (
        <p className="text-xs leading-relaxed text-zinc-500">
          On an attributed basis this looks like {num(r.attributedCostPct)}% cost to serve; counting only bookings that would not
          have happened anyway, it is {num(r.costToServePct)}%. The gap is the cost of contacting customers who were going to
          book regardless.
        </p>
      ) : null}
    </div>
  );
}

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
  const set = (k: InputKey, value: string) => onChange({ ...raw, [k]: value });

  return (
    <Card>
      <div className="border-b border-zinc-200 p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Experiment {def.number}</div>
            <h3 className="mt-0.5 text-lg font-semibold text-zinc-900">{def.title}</h3>
          </div>
          <button
            type="button"
            onClick={onReset}
            className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-md border border-zinc-200 px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Reset to preset
          </button>
        </div>
        <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-zinc-500">Treatment</dt>
            <dd className="text-zinc-800">{def.treatment}</dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-500">Control</dt>
            <dd className="text-zinc-800">{def.control}</dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-500">Primary metric</dt>
            <dd className="text-zinc-800">{def.primaryMetric}</dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-500">Guardrails</dt>
            <dd className="text-zinc-800">{def.guardrailNote}</dd>
          </div>
        </dl>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="space-y-5 border-t border-zinc-200 p-4 sm:p-5 lg:border-r lg:border-t-0">
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

        <div className="order-first p-4 sm:p-5 lg:order-none">
          {results && values ? (
            <Results
              def={def}
              r={results}
              rates={{ t: values.treatmentRatePct, c: values.controlRatePct, conn: values.connectionRatePct }}
            />
          ) : (
            <div className="flex h-full min-h-48 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-red-200 bg-red-50/40 p-6 text-center">
              <AlertTriangle className="h-5 w-5 text-red-500" aria-hidden />
              <p className="text-sm font-medium text-zinc-900">Fix the highlighted inputs to see results</p>
              <p className="text-xs text-zinc-500">Nothing is calculated from invalid assumptions.</p>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
