"use client";

import { ChevronDown } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import type { Verdict } from "@/lib/experiments";
import type { FinalAction } from "@/lib/types";
import { useAnimatedNumber } from "./motion";

export function cn(...xs: (string | false | null | undefined)[]) {
  return xs.filter(Boolean).join(" ");
}

/* ------------------------------------------------------------------ */
/* Actions & verdicts                                                  */
/* ------------------------------------------------------------------ */

export const ACTION_META: Record<FinalAction, { label: string; className: string }> = {
  AGENT_CALL: { label: "Agent call", className: "bg-agent text-white" },
  WHATSAPP_NUDGE: { label: "WhatsApp nudge", className: "bg-agent-soft text-agent" },
  LEAVE_TO_APP: { label: "Leave to app", className: "bg-surface text-ink-2 ring-1 ring-inset ring-rule" },
  HOLDOUT: { label: "Holdout, no contact", className: "bg-canvas text-muted outline-1 -outline-offset-1 outline-dashed outline-anyway" },
};

export function ActionBadge({ action, className }: { action: FinalAction; className?: string }) {
  const m = ACTION_META[action];
  return (
    <span className={cn("inline-flex items-center whitespace-nowrap rounded-[5px] px-2 py-1 text-[13px] font-medium leading-none", m.className, className)}>
      {m.label}
    </span>
  );
}

export const VERDICT_STYLE: Record<Verdict, { word: string; text: string; soft: string; rule: string }> = {
  SCALE: { word: "Scale", text: "text-agent", soft: "bg-agent-soft", rule: "border-agent" },
  ITERATE: { word: "Iterate", text: "text-iterate", soft: "bg-iterate-soft", rule: "border-iterate" },
  KILL: { word: "Kill", text: "text-kill", soft: "bg-kill-soft", rule: "border-kill" },
};

/* ------------------------------------------------------------------ */
/* Layout                                                              */
/* ------------------------------------------------------------------ */

export function SectionHeading({ id, title, children }: { id?: string; title: string; children?: ReactNode }) {
  return (
    <div className="max-w-[68ch]">
      <h2 id={id} className="text-[22px] font-semibold leading-tight tracking-[-0.01em] text-ink sm:text-[30px]">
        {title}
      </h2>
      {children ? <p className="mt-2 text-[15px] leading-relaxed text-muted sm:text-[17px]">{children}</p> : null}
    </div>
  );
}

/** A ruled disclosure row: no card, just a hairline and a chevron. */
export function Disclosure({
  title,
  summary,
  children,
  defaultOpen = false,
  className,
}: {
  title: string;
  summary?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  return (
    <div className={cn("border-t border-rule", className)}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        className="group flex w-full items-center justify-between gap-4 py-4 text-left"
      >
        <span className="min-w-0">
          <span className="block text-[15px] font-semibold text-ink group-hover:text-agent">{title}</span>
          {summary ? <span className="mt-0.5 block text-[13px] text-muted">{summary}</span> : null}
        </span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted transition-transform motion-reduce:transition-none", open && "rotate-180")} aria-hidden />
      </button>
      {open ? (
        <div id={id} className="pb-6">
          {children}
        </div>
      ) : null}
    </div>
  );
}

export function SubLabel({ children }: { children: ReactNode }) {
  return <div className="text-[13px] font-semibold text-ink-2">{children}</div>;
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
      <span className="text-[13px] text-muted">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="h-9 w-full min-w-0 rounded-md border border-rule bg-surface px-2 text-[14px] text-ink focus:border-agent focus:outline-none sm:px-2.5"
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

/** A number that tweens to new values (instant under reduced motion). */
export function AnimatedNumber({ value, format }: { value: number; format: (n: number) => string }) {
  const v = useAnimatedNumber(value);
  return <>{format(v)}</>;
}
