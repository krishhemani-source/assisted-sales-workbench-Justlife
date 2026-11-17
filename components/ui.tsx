"use client";

import { ChevronDown, Info } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import type { FinalAction } from "@/lib/types";
import type { Verdict } from "@/lib/experiments";

export function cn(...xs: (string | false | null | undefined)[]) {
  return xs.filter(Boolean).join(" ");
}

export const ACTION_META: Record<FinalAction, { label: string; className: string }> = {
  AGENT_CALL: { label: "Agent call", className: "bg-indigo-50 text-indigo-700 ring-indigo-200" },
  WHATSAPP_NUDGE: { label: "WhatsApp nudge", className: "bg-teal-50 text-teal-700 ring-teal-200" },
  LEAVE_TO_APP: { label: "Leave to app", className: "bg-white text-zinc-600 ring-zinc-300" },
  HOLDOUT: { label: "Holdout · no contact", className: "bg-zinc-100 text-zinc-500 ring-zinc-200" },
};

export function ActionBadge({ action, className }: { action: FinalAction; className?: string }) {
  const m = ACTION_META[action];
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
        m.className,
        className,
      )}
    >
      {m.label}
    </span>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("rounded-xl border border-zinc-200 bg-white", className)}>{children}</div>;
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">{children}</div>;
}

export function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="truncate text-xs text-zinc-500">{label}</div>
      <div className="mt-1 text-xl font-semibold tabular-nums text-zinc-900">{value}</div>
      {sub ? <div className="mt-0.5 text-xs text-zinc-500">{sub}</div> : null}
    </div>
  );
}

export function InfoBox({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-600", className)}>
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" aria-hidden />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function Collapsible({
  title,
  subtitle,
  children,
  defaultOpen = false,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  return (
    <Card>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-4 rounded-xl px-4 py-3 text-left hover:bg-zinc-50 sm:px-5"
      >
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-zinc-900">{title}</span>
          {subtitle ? <span className="mt-0.5 block text-xs text-zinc-500">{subtitle}</span> : null}
        </span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-zinc-400 transition-transform", open && "rotate-180")} aria-hidden />
      </button>
      {open ? (
        <div id={id} className="border-t border-zinc-200 px-4 py-4 sm:px-5">
          {children}
        </div>
      ) : null}
    </Card>
  );
}

export function Select<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1">
      <span className="text-xs font-medium text-zinc-500">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="h-9 rounded-lg border border-zinc-300 bg-white px-2.5 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export const VERDICT_STYLE: Record<Verdict, { chip: string; card: string; label: string }> = {
  SCALE: { chip: "bg-emerald-50 text-emerald-700 ring-emerald-200", card: "border-emerald-200 bg-emerald-50/60", label: "Scale" },
  ITERATE: { chip: "bg-amber-50 text-amber-800 ring-amber-200", card: "border-amber-200 bg-amber-50/60", label: "Iterate" },
  KILL: { chip: "bg-red-50 text-red-700 ring-red-200", card: "border-red-200 bg-red-50/60", label: "Kill" },
};
