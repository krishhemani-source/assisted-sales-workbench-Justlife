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
import type { Thresholds } from "@/lib/types";
import { cn, Collapsible, SectionLabel } from "./ui";

function PointTable({ title, rows }: { title: string; rows: [string, number][] }) {
  return (
    <div className="min-w-0">
      <div className="mb-1.5 text-xs font-medium text-zinc-700">{title}</div>
      <table className="w-full text-xs">
        <tbody className="divide-y divide-zinc-100">
          {rows.map(([k, v]) => (
            <tr key={k}>
              <td className="py-1 text-zinc-500">{k}</td>
              <td className="py-1 text-right tabular-nums text-zinc-900">{v}</td>
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
      <div className="mb-1 flex items-baseline justify-between text-sm">
        <span className="text-zinc-700">{label}</span>
        <span className="font-semibold tabular-nums text-zinc-900">{value}%</span>
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
      <span className="text-xs text-zinc-500">{label}</span>
      <input
        type="number"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={invalid}
        className={cn(
          "h-9 w-full rounded-lg border bg-white px-2.5 text-sm tabular-nums text-zinc-900 focus:outline-none focus:ring-2",
          invalid ? "border-red-400 focus:ring-red-100" : "border-zinc-300 focus:border-zinc-500 focus:ring-zinc-200",
        )}
      />
    </label>
  );
}

export function MethodologyPanel({
  intentPct,
  onIntentPct,
  thresholdDraft,
  thresholdsValid,
  appliedThresholds,
  onThreshold,
  onReset,
}: {
  intentPct: number;
  onIntentPct: (v: number) => void;
  thresholdDraft: { agentCall: string; whatsapp: string };
  thresholdsValid: boolean;
  appliedThresholds: Thresholds;
  onThreshold: (k: keyof Thresholds, v: string) => void;
  onReset: () => void;
}) {
  return (
    <Collapsible
      title="How the score works"
      subtitle={`Opportunity = Intent × ${intentPct}% + App-failure × ${100 - intentPct}%. Adjust weights and action bands here.`}
    >
      <div className="space-y-6">
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
          A transparent, rule-based prioritisation hypothesis. Actual incremental uplift must be validated through randomised
          experiments.
        </p>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <SectionLabel>Weights (always sum to 100%)</SectionLabel>
            <Slider label="Intent" value={intentPct} onChange={onIntentPct} />
            <Slider label="App-failure likelihood" value={100 - intentPct} onChange={(v) => onIntentPct(100 - v)} />
            <p className="text-xs leading-relaxed text-zinc-500">
              App-failure is weighted higher by default: high intent alone does not mean a human adds bookings. A customer who
              will finish in the app anyway is a cost, not an opportunity.
            </p>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <SectionLabel>Action bands</SectionLabel>
              <button
                type="button"
                onClick={onReset}
                className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100"
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
              <ul className="space-y-1 text-xs text-zinc-600">
                <li>≥ {appliedThresholds.agentCall}: Agent call</li>
                <li>
                  {appliedThresholds.whatsapp} to &lt; {appliedThresholds.agentCall}: WhatsApp nudge
                </li>
                <li>&lt; {appliedThresholds.whatsapp}: Leave to app</li>
                <li>Callback requests: always Agent call (override)</li>
              </ul>
            ) : (
              <p className="text-xs text-red-600" role="alert">
                Bands must satisfy 0 ≤ WhatsApp ≤ Agent call ≤ 100. Still using {appliedThresholds.whatsapp} /{" "}
                {appliedThresholds.agentCall} until fixed.
              </p>
            )}
          </div>
        </div>

        <div>
          <SectionLabel>Intent (0–100) = source + recency + stage</SectionLabel>
          <div className="mt-2 grid gap-5 sm:grid-cols-3">
            <PointTable title="Lead source" rows={entries(INTENT_SOURCE_POINTS, SOURCE_LABELS)} />
            <PointTable title="Hours since drop-off" rows={INTENT_RECENCY_BANDS.map((b) => [b.label, b.points])} />
            <PointTable title="Funnel stage reached" rows={entries(INTENT_STAGE_POINTS, STAGE_LABELS)} />
          </div>
        </div>
        <div>
          <SectionLabel>App-failure likelihood (0–100) = complexity + value + stage + history</SectionLabel>
          <div className="mt-2 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <PointTable title="Service complexity" rows={entries(APPFAIL_COMPLEXITY_POINTS, SERVICE_LABELS)} />
            <PointTable title="Basket value" rows={APPFAIL_BASKET_BANDS.map((b) => [b.label, b.points])} />
            <PointTable title="Drop-off stage" rows={entries(APPFAIL_STAGE_POINTS, STAGE_LABELS)} />
            <PointTable title="Customer history" rows={APPFAIL_HISTORY_BANDS.map((b) => [b.label, b.points])} />
          </div>
        </div>
      </div>
    </Collapsible>
  );
}
