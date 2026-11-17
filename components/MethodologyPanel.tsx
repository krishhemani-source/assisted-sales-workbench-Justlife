"use client";

import { RotateCcw } from "lucide-react";
import {
  APPFAIL_BASKET_BANDS,
  APPFAIL_COMPLEXITY_POINTS,
  APPFAIL_HISTORY_BANDS,
  APPFAIL_STAGE_POINTS,
  INTENT_RECENCY_BANDS,
  INTENT_SOURCE_POINTS,
  INTENT_STAGE_POINTS,
  SERVICE_LABELS,
  SOURCE_LABELS,
  STAGE_LABELS,
} from "@/lib/config";
import type { Scoring } from "./useScoring";
import { cn, Disclosure, SubLabel } from "./ui";

function PointTable({ title, rows }: { title: string; rows: [string, number][] }) {
  return (
    <div className="min-w-0">
      <div className="mb-1.5 text-[13px] font-medium text-ink-2">{title}</div>
      <table className="w-full text-[13px]">
        <tbody className="divide-y divide-rule/70">
          {rows.map(([k, v]) => (
            <tr key={k}>
              <td className="py-1 text-muted">{k}</td>
              <td className="py-1 text-right text-ink">{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const entries = <K extends string>(rec: Record<K, number>, labels: Record<K, string>): [string, number][] =>
  (Object.keys(rec) as K[]).map((k) => [labels[k], rec[k]]);

function Slider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <div className="mb-1 flex items-baseline justify-between text-[14px]">
        <span className="text-ink-2">{label}</span>
        <span className="font-semibold text-ink">{value}%</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
      />
    </label>
  );
}

function NumberField({
  label,
  value,
  onChange,
  invalid,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  invalid: boolean;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1">
      <span className="text-[13px] text-muted">{label}</span>
      <input
        type="number"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={invalid}
        className={cn(
          "h-9 w-full rounded-md border bg-surface px-2.5 text-[14px] text-ink focus:outline-none focus:ring-2",
          invalid ? "border-kill focus:ring-kill-soft" : "border-rule focus:border-agent focus:ring-agent-soft",
        )}
      />
    </label>
  );
}

export function MethodologyPanel({ scoring }: { scoring: Scoring }) {
  const {
    intentPct,
    setIntentPct: onIntentPct,
    thresholdDraft,
    thresholdsValid,
    thresholds: appliedThresholds,
    onThreshold,
    reset: onReset,
  } = scoring;
  return (
    <Disclosure
      title="How the score works"
      summary={`Advanced. Opportunity = intent × ${intentPct}% + app failure × ${100 - intentPct}%. Adjust weights, action bands and see every point.`}
    >
      <div className="max-w-[1000px] space-y-8">
        <p className="rounded-md bg-surface px-4 py-3 text-[14px] text-ink-2">
          A transparent, rule-based prioritisation hypothesis. Actual incremental uplift must be validated through randomised
          experiments.
        </p>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <SubLabel>Weights, always summing to 100%</SubLabel>
            <Slider label="Intent" value={intentPct} onChange={onIntentPct} />
            <Slider label="App failure likelihood" value={100 - intentPct} onChange={(v) => onIntentPct(100 - v)} />
            <p className="text-[13px] leading-relaxed text-muted">
              App failure is weighted higher by default: high intent alone does not mean a human adds bookings. A customer who
              will finish in the app anyway is a cost, not an opportunity.
            </p>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <SubLabel>Action bands</SubLabel>
              <button
                type="button"
                onClick={onReset}
                className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[13px] font-medium text-ink-2 hover:bg-surface"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Reset to defaults
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <NumberField
                label="Agent call at or above"
                value={thresholdDraft.agentCall}
                onChange={(v) => onThreshold("agentCall", v)}
                invalid={!thresholdsValid}
              />
              <NumberField
                label="WhatsApp nudge at or above"
                value={thresholdDraft.whatsapp}
                onChange={(v) => onThreshold("whatsapp", v)}
                invalid={!thresholdsValid}
              />
            </div>
            {thresholdsValid ? (
              <ul className="space-y-1 text-[13px] text-ink-2">
                <li>≥ {appliedThresholds.agentCall}: Agent call</li>
                <li>
                  {appliedThresholds.whatsapp} to &lt; {appliedThresholds.agentCall}: WhatsApp nudge
                </li>
                <li>&lt; {appliedThresholds.whatsapp}: Leave to app</li>
                <li>Callback requests: always Agent call (override)</li>
              </ul>
            ) : (
              <p className="text-[13px] text-kill" role="alert">
                Bands must satisfy 0 ≤ WhatsApp ≤ Agent call ≤ 100. Still using {appliedThresholds.whatsapp} /{" "}
                {appliedThresholds.agentCall} until fixed.
              </p>
            )}
          </div>
        </div>

        <div>
          <SubLabel>Intent (0 to 100) = source + recency + stage</SubLabel>
          <div className="mt-2 grid gap-5 sm:grid-cols-3">
            <PointTable title="Lead source" rows={entries(INTENT_SOURCE_POINTS, SOURCE_LABELS)} />
            <PointTable title="Hours since drop-off" rows={INTENT_RECENCY_BANDS.map((b) => [b.label, b.points])} />
            <PointTable title="Funnel stage reached" rows={entries(INTENT_STAGE_POINTS, STAGE_LABELS)} />
          </div>
        </div>
        <div>
          <SubLabel>App failure likelihood (0 to 100) = complexity + value + stage + history</SubLabel>
          <div className="mt-2 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <PointTable title="Service complexity" rows={entries(APPFAIL_COMPLEXITY_POINTS, SERVICE_LABELS)} />
            <PointTable title="Basket value" rows={APPFAIL_BASKET_BANDS.map((b) => [b.label, b.points])} />
            <PointTable title="Drop-off stage" rows={entries(APPFAIL_STAGE_POINTS, STAGE_LABELS)} />
            <PointTable title="Customer history" rows={APPFAIL_HISTORY_BANDS.map((b) => [b.label, b.points])} />
          </div>
        </div>
      </div>
    </Disclosure>
  );
}
