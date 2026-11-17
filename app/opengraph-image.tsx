import { ImageResponse } from "next/og";
import { EXPERIMENTS, computeResults } from "@/lib/experiments";

export const alt = "Not every high-intent customer needs a call. 132 bookings: 120 would have happened anyway, 12 caused by agents.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const r = computeResults(EXPERIMENTS[0].preset, EXPERIMENTS[0].hasOptOut);
  const total = Math.round(r.treatmentBookings);
  const caused = Math.round(r.incrementalBookings);
  const causedPct = (caused / total) * 100;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#F3F5F4", padding: "72px 80px", color: "#15201D" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 26, color: "#5F6B67" }}>
          <div style={{ width: 40, height: 40, borderRadius: 9, background: "#0E5C49", color: "#F3F5F4", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, fontWeight: 700 }}>A</div>
          Assisted Sales Experiment Workbench
        </div>
        <div style={{ marginTop: 56, fontSize: 76, fontWeight: 700, lineHeight: 1.05, letterSpacing: -2, maxWidth: 940 }}>
          Not every high-intent customer needs a call.
        </div>
        <div style={{ marginTop: "auto", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", width: "100%", height: 64, borderRadius: 4, overflow: "hidden", background: "#C8C1B6" }}>
            <div style={{ width: `${100 - causedPct}%`, height: "100%" }} />
            <div style={{ width: `${causedPct}%`, height: "100%", background: "#0E5C49", borderLeft: "3px solid #F3F5F4" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 18, fontSize: 28 }}>
            <span style={{ color: "#6A635A" }}>{total - caused} would have booked anyway</span>
            <span style={{ color: "#0E5C49", fontWeight: 700 }}>{caused} caused by agents</span>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
