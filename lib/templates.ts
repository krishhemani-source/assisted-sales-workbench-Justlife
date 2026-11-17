import { SERVICE_LABELS } from "./config";
import type { DropOffStep, Service } from "./config";
import type { FinalAction, Lead } from "./types";

/** Deterministic outreach guidance. Polite, no pressure, never discount-first. */

const STAGE_TACTIC: Record<DropOffStep, string> = {
  pricing:
    "Lead with what the price includes (team, duration, materials, guarantee) and offer a visit or call-back window. Never open with a discount.",
  scheduling:
    "Offer two or three concrete slots, including the earliest available, and confirm what the customer needs to prepare.",
  service_selection:
    "Ask one question about the job and recommend a single package; avoid reading out every option.",
  payment:
    "Check gently whether something went wrong at payment (method, card, trust) and offer to hold the slot while they finish.",
};

const SERVICE_TACTIC: Record<Service, string> = {
  packing_moving: "Offer a free pre-move survey (video or in person) so the quote is firm before they commit.",
  pest_control: "Explain the treatment, safety for children and pets, and the re-visit guarantee.",
  deep_cleaning: "Confirm scope (rooms, appliances, balcony) so the quote matches expectations.",
  salon_at_home: "Confirm professional availability and the products used.",
  home_cleaning: "Keep it brief; mention recurring slots only if they ask.",
};

const ACTION_FRAME: Record<FinalAction, string> = {
  AGENT_CALL: "One call attempt within the target window; if unanswered, a single WhatsApp follow-up. No repeated chasing.",
  WHATSAPP_NUDGE: "One contextual WhatsApp message. No call unless the customer replies asking for one.",
  LEAVE_TO_APP: "No human contact. The app journey is likely to close this on its own; agent time is better spent elsewhere.",
  HOLDOUT:
    "No contact by design. This lead is in the lead-level holdout that measures whether the assisted channel creates bookings at all.",
};

export interface Approach {
  summary: string;
  steps: string[];
}

export function suggestedApproach(lead: Lead, action: FinalAction, override: boolean): Approach {
  if (action === "HOLDOUT" || action === "LEAVE_TO_APP") {
    return { summary: ACTION_FRAME[action], steps: [] };
  }
  const summary = override
    ? "The customer asked for a call. Call promptly; the score only shapes what to say."
    : ACTION_FRAME[action];
  return { summary, steps: [STAGE_TACTIC[lead.drop_off_step], SERVICE_TACTIC[lead.service]] };
}

const STAGE_LINE: Record<DropOffStep, string> = {
  pricing: "I can walk you through exactly what the price covers, so there are no surprises.",
  scheduling: "I can share the next few available slots if that helps you pick a time.",
  service_selection: "If you tell me a little about the job, I can point you to the option that fits best.",
  payment: "If anything didn't go through at payment, I'm happy to hold the slot while you finish.",
};

export interface Draft {
  channel: "Call opener" | "WhatsApp draft";
  text: string;
}

export function draftMessage(lead: Lead, action: FinalAction, override: boolean): Draft | null {
  const service = SERVICE_LABELS[lead.service].toLowerCase();
  if (action === "AGENT_CALL") {
    const opener = override
      ? `Hi, this is [Agent] from the bookings team, returning your callback request about ${service}. Is now still a good time?`
      : `Hi, this is [Agent] from the bookings team. I saw you were looking at ${service} earlier and wanted to check whether anything was unclear. Is now an okay time for two minutes?`;
    return { channel: "Call opener", text: `${opener} ${STAGE_LINE[lead.drop_off_step]}` };
  }
  if (action === "WHATSAPP_NUDGE") {
    return {
      channel: "WhatsApp draft",
      text: `Hi, this is [Agent] from the bookings team. I noticed you were looking at ${service}. ${STAGE_LINE[lead.drop_off_step]} Happy to help here, or carry on in the app whenever suits you. Reply STOP to opt out.`,
    };
  }
  return null;
}
