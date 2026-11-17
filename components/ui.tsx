"use client";

import { ChevronDown } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import type { Verdict } from "@/lib/experiments";
import type { FinalAction } from "@/lib/types";

export function cn(...xs: (string | false | null | undefined)[]) {
  return xs.filter(Boolean).join(" ");
}

/** One accent (deep green). Amber = ITERATE / caution. Red = breached guardrail / KILL only. */
export const ACTION_META: Record<FinalAction, { label: string; className: string }> = {
  AGENT_CALL: { label: "Agent call", className: "bg-emerald-800 text-white ring-emerald-800" },
  WHATSAPP_NUDGE: { label: "WhatsApp nudge", className: "bg-emerald-50 text-emerald-900 ring-emerald-200" },
  LEAVE_TO_APP: { label: "Leave to app", className: "bg-white text-zinc-700 ring-zinc-300" },
  HOLDOUT: { label: "Holdout · no contact", className: "bg-zinc-100 text-zinc-500 ring-zinc-200" },
};

export function ActionBadge({ action, className, size = "md" }: { action: FinalAction; className?: string; size?: "sm" | "md" }) {
  const m = ACTION_META[action];
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full font-medium ring-1 ring-inset",
        size === "md" ? "px-2.5 py-1 text-xs" : "px-2 py-0.5 text-[11px]",
        m.className,
        className,
      )}
    >
      {m.label}
    </span>
  );
}

export const VERDICT_STYLE: Record<Verdict, { chip: string; card: string; label: string; text: string }> = {
  SCALE: { chip: "bg-emerald-800 text-white ring-emerald-800", card: "bg-emerald-50 ring-emerald-200", label: "Scale", text: "text-emerald-900" },
  ITERATE: { chip: "bg-amber-400 text-amber-950 ring-amber-400", card: "bg-amber-50 ring-amber-200", label: "Iterate", text: "text-amber-900" },
  KILL: { chip: "bg-red-700 text-white ring-red-700", card: "bg-red-50 ring-red-200", label: "Kill", text: "text-red-900" },
};

export function Card({ children, className, id }: { children: ReactNode; className?: string; id?: string }) {
  return (
    <div id={id} className={cn("rounded-2xl bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] ring-1 ring-zinc-950/[0.06]", className)}>
      {children}
    </div>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">{children}</div>;
}

export function Collapsible({
  title,
  subtitle,
  children,
  defaultOpen = false,
  icon,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  defaultOpen?: boolean;
  icon?: ReactNode;
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
        className="flex w-full items-center justify-between gap-4 rounded-2xl px-5 py-4 text-left hover:bg-zinc-50/70 sm:px-6"
      >
        <span className="flex min-w-0 items-start gap-3">
          {icon ? <span className="mt-0.5 shrink-0 text-zinc-400">{icon}</span> : null}
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-zinc-900">{title}</span>
            {subtitle ? <span className="mt-0.5 block text-xs text-zinc-500">{subtitle}</span> : null}
          </span>
        </span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-zinc-400 transition-transform", open && "rotate-180")} aria-hidden />
      </button>
      {open ? (
        <div id={id} className="px-5 pb-5 sm:px-6 sm:pb-6">
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
        className="h-9 rounded-lg border border-zinc-200 bg-white px-2.5 text-sm text-zinc-900 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-100"
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
