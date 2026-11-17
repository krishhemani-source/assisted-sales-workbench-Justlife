import type { City, DropOffStep, LeadSource, Service } from "./config";

export interface Lead {
  id: string;
  lead_source: LeadSource;
  service: Service;
  drop_off_step: DropOffStep;
  basket_value_aed: number;
  hours_since_dropoff: number;
  past_bookings: number;
  city: City;
}

export type Action = "AGENT_CALL" | "WHATSAPP_NUDGE" | "LEAVE_TO_APP";
export type FinalAction = Action | "HOLDOUT";

export interface Weights {
  intent: number;
  appFailure: number;
}

export interface Thresholds {
  agentCall: number;
  whatsapp: number;
}
