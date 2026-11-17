"use client";

import { num1 } from "@/lib/format";
import { cn } from "./ui";

/**
 * The page's one visual idea: bookings split into "would have happened anyway" (warm grey)
 * and "caused by agents" (green). Used in the hero and for every experiment.
 */
export function SplitBar({
  total,
  caused,
  anywayLabel = "Would have booked anyway",
  causedLabel = "Caused by agents",
  intro = false,
  size = "lg",
}: {
  total: number;
  caused: number;
  anywayLabel?: string;
  causedLabel?: string;
  /** Play the one-time draw-and-split animation (hero only). */
  intro?: boolean;
  size?: "lg" | "md";
}) {
  const safeTotal = Math.max(0, total);
  const causedClamped = Math.max(0, Math.min(caused, safeTotal));
  const anyway = safeTotal - causedClamped;
  const causedPct = safeTotal > 0 ? (causedClamped / safeTotal) * 100 : 0;

  return (
    <figure
      className="m-0"
      aria-label={`${num1(safeTotal)} bookings: ${num1(anyway)} ${anywayLabel.toLowerCase()}, ${num1(causedClamped)} ${causedLabel.toLowerCase()}`}
    >
      <div
        className={cn(
          "relative w-full overflow-hidden rounded-[3px] bg-anyway",
          size === "lg" ? "h-11 sm:h-14" : "h-8",
          intro && "bar-draw",
        )}
      >
        <div
          className={cn(
            "absolute inset-y-0 right-0 bg-agent transition-[width] duration-300 ease-out motion-reduce:transition-none",
            intro && "bar-split",
          )}
          style={{ width: `${causedPct}%` }}
        >
          {/* hairline of canvas colour marks the split */}
          <span className="absolute inset-y-0 left-0 w-[2px] bg-canvas" aria-hidden />
        </div>
      </div>
      <figcaption className="mt-2.5 flex items-start justify-between gap-4 text-sm">
        <span className="flex items-baseline gap-2 text-anyway-ink">
          <span className="relative top-[1px] inline-block h-2.5 w-2.5 shrink-0 rounded-[2px] bg-anyway" aria-hidden />
          <span>
            {anywayLabel} <strong className="font-semibold text-ink">{num1(anyway)}</strong>
          </span>
        </span>
        <span className="flex items-baseline gap-2 text-right text-agent">
          <span>
            {causedLabel} <strong className="font-semibold">{num1(caused)}</strong>
          </span>
          <span className="relative top-[1px] inline-block h-2.5 w-2.5 shrink-0 rounded-[2px] bg-agent" aria-hidden />
        </span>
      </figcaption>
    </figure>
  );
}
