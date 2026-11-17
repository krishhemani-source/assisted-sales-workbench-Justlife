/**
 * Deterministic synthetic lead generator. Synthetic data. Illustrative only.
 *
 *   npm run generate:leads
 *
 * Uses a seeded mulberry32 PRNG so the output is identical on every run.
 * The resulting /data/leads.json is committed; the app never generates data at runtime.
 * Only this dataset is tuned to give a sensible action mix; the scoring rules are not.
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import type { City, DropOffStep, LeadSource, Service } from "../lib/config";
import { scoreLead } from "../lib/scoring";
import { isInHoldout } from "../lib/holdout";
import type { Lead } from "../lib/types";

const SEED = 20251117;

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(SEED);
const pick = <T>(xs: readonly T[]): T => xs[Math.floor(rand() * xs.length)];
const int = (lo: number, hi: number) => lo + Math.floor(rand() * (hi - lo + 1));
const hours = (lo: number, hi: number) => Math.round((lo + rand() * (hi - lo)) * 2) / 2;

const BASKET_RANGE: Record<Service, [number, number]> = {
  home_cleaning: [120, 300],
  salon_at_home: [150, 450],
  deep_cleaning: [350, 900],
  pest_control: [250, 700],
  packing_moving: [900, 4000],
};

const basket = (s: Service, lo?: number, hi?: number) => {
  const [a, b] = BASKET_RANGE[s];
  const v = int(Math.max(a, lo ?? a), Math.min(b, hi ?? b));
  return s === "packing_moving" ? Math.round(v / 50) * 50 : Math.round(v / 5) * 5;
};

const city = (): City => {
  const r = rand();
  return r < 0.6 ? "Dubai" : r < 0.82 ? "Abu Dhabi" : "Sharjah";
};

type Draft = Omit<Lead, "id">;
interface Archetype {
  name: string;
  count: number;
  make: () => Omit<Draft, "city">;
}

const ARCHETYPES: Archetype[] = [
  {
    // High intent, but would very likely book anyway.
    name: "High-intent repeat customer (likely to self-serve)",
    count: 13,
    make: () => {
      const service = pick<Service>(["home_cleaning", "home_cleaning", "salon_at_home"]);
      return {
        lead_source: pick<LeadSource>(["checkout_dropoff", "checkout_dropoff", "whatsapp_inbound"]),
        service,
        drop_off_step: "payment",
        basket_value_aed: basket(service, undefined, 380),
        hours_since_dropoff: hours(0.5, 20),
        past_bookings: int(3, 12),
      };
    },
  },
  {
    name: "Low-intent browser (routine service)",
    count: 9,
    make: () => {
      const service = pick<Service>(["home_cleaning", "salon_at_home"]);
      return {
        lead_source: "browse_abandon",
        service,
        drop_off_step: pick<DropOffStep>(["service_selection", "pricing", "payment"]),
        basket_value_aed: basket(service),
        hours_since_dropoff: hours(26, 120),
        past_bookings: int(1, 6),
      };
    },
  },
  {
    name: "Explicit callback request",
    count: 8,
    make: () => {
      const service = pick<Service>(["packing_moving", "pest_control", "deep_cleaning", "home_cleaning", "salon_at_home"]);
      return {
        lead_source: "call_me_back",
        service,
        drop_off_step: pick<DropOffStep>(["service_selection", "pricing", "scheduling", "payment"]),
        basket_value_aed: basket(service),
        hours_since_dropoff: hours(0.5, 6),
        past_bookings: int(0, 6),
      };
    },
  },
  {
    // Low-ish intent signals but the app is unlikely to close alone.
    name: "First-time customer, complex service",
    count: 10,
    make: () => {
      const service = pick<Service>(["packing_moving", "packing_moving", "pest_control", "deep_cleaning"]);
      return {
        lead_source: pick<LeadSource>(["browse_abandon", "checkout_dropoff", "whatsapp_inbound"]),
        service,
        drop_off_step: pick<DropOffStep>(["pricing", "scheduling", "service_selection"]),
        basket_value_aed: basket(service),
        hours_since_dropoff: hours(1, 60),
        past_bookings: 0,
      };
    },
  },
  {
    name: "Stuck at pricing or scheduling",
    count: 9,
    make: () => {
      const service = pick<Service>(["deep_cleaning", "pest_control", "salon_at_home", "home_cleaning", "salon_at_home", "home_cleaning"]);
      return {
        lead_source: pick<LeadSource>(["checkout_dropoff", "whatsapp_inbound"]),
        service,
        drop_off_step: pick<DropOffStep>(["pricing", "scheduling"]),
        basket_value_aed: basket(service),
        hours_since_dropoff: hours(1, 48),
        past_bookings: int(1, 2),
      };
    },
  },
  {
    name: "Ambiguous lead suited to a WhatsApp nudge",
    count: 11,
    make: () => {
      const service = pick<Service>(["salon_at_home", "home_cleaning", "deep_cleaning"]);
      return {
        lead_source: pick<LeadSource>(["whatsapp_inbound", "browse_abandon", "checkout_dropoff"]),
        service,
        drop_off_step: pick<DropOffStep>(["service_selection", "scheduling", "pricing"]),
        basket_value_aed: basket(service, undefined, 520),
        hours_since_dropoff: hours(3, 70),
        past_bookings: int(2, 4),
      };
    },
  },
];

const drafts: { archetype: string; lead: Draft }[] = [];
for (const a of ARCHETYPES) {
  for (let i = 0; i < a.count; i++) drafts.push({ archetype: a.name, lead: { ...a.make(), city: city() } });
}

// Seeded Fisher-Yates shuffle so archetypes are interleaved in the table.
for (let i = drafts.length - 1; i > 0; i--) {
  const j = Math.floor(rand() * (i + 1));
  [drafts[i], drafts[j]] = [drafts[j], drafts[i]];
}

const leads: Lead[] = drafts.map((d, i) => ({
  id: `L-${String(i + 1).padStart(3, "0")}`,
  lead_source: d.lead.lead_source,
  service: d.lead.service,
  drop_off_step: d.lead.drop_off_step,
  basket_value_aed: d.lead.basket_value_aed,
  hours_since_dropoff: d.lead.hours_since_dropoff,
  past_bookings: d.lead.past_bookings,
  city: d.lead.city,
}));

if (leads.length !== 60) throw new Error(`Expected 60 leads, got ${leads.length}`);
writeFileSync(join(__dirname, "..", "data", "leads.json"), JSON.stringify(leads, null, 2) + "\n");

/* ---------------- distribution log ---------------- */
const counts: Record<string, number> = { AGENT_CALL: 0, WHATSAPP_NUDGE: 0, LEAVE_TO_APP: 0 };
const byArchetype: Record<string, Record<string, number>> = {};
leads.forEach((l, i) => {
  const a = scoreLead(l).action;
  counts[a]++;
  const k = drafts[i].archetype;
  byArchetype[k] ??= { AGENT_CALL: 0, WHATSAPP_NUDGE: 0, LEAVE_TO_APP: 0 };
  byArchetype[k][a]++;
});
const pct = (n: number) => `${((n / leads.length) * 100).toFixed(0)}%`;
console.log("Action distribution (default weights/thresholds, before holdout):");
for (const [k, v] of Object.entries(counts)) console.log(`  ${k.padEnd(15)} ${String(v).padStart(2)}  ${pct(v)}`);
console.log("By archetype:");
for (const [k, v] of Object.entries(byArchetype)) console.log(`  ${k}: ${JSON.stringify(v)}`);
const eligible = leads.filter((l) => l.lead_source !== "call_me_back");
console.log(`Holdout: ${leads.filter(isInHoldout).length} of ${eligible.length} eligible leads`);
