import type { EncounterParticipant } from "../models/types";

export type EncounterEvent =
  | { id: string; at: string; t: "COMBAT_STARTED" }
  | { id: string; at: string; t: "COMBAT_STOPPED" }
  | {
      id: string;
      at: string;
      t: "PARTICIPANT_ADDED";
      participant: Omit<EncounterParticipant, "id">;
    }
  | { id: string; at: string; t: "PARTICIPANT_REMOVED"; participantId: string }
  | { id: string; at: string; t: "ROUND_SET"; value: number }
  | { id: string; at: string; t: "TURN_ADVANCED"; direction: 1 | -1 }
  | { id: string; at: string; t: "INITIATIVE_SET"; participantId: string; value: number | null }
  | { id: string; at: string; t: "DAMAGE_APPLIED"; participantId: string; amount: number }
  | { id: string; at: string; t: "HEAL_APPLIED"; participantId: string; amount: number }
  | { id: string; at: string; t: "TEMP_HP_SET"; participantId: string; value: number | null }
  | { id: string; at: string; t: "CONDITIONS_SET"; participantId: string; value: string[] }
  | { id: string; at: string; t: "NOTES_SET"; participantId: string; value: string }
  | { id: string; at: string; t: "COMBAT_MODE_SET"; mode: "prep" | "live" }
  | { id: string; at: string; t: "ENCOUNTER_COMPLETED"; notes?: string }
  | {
      id: string;
      at: string;
      t: "ROLL_RECORDED";
      /** PC or participant id who made the roll. Omit for DM rolls. */
      actorId?: string;
      mode: "digital" | "manual" | "dm";
      context: string;
      formula: string;
      rawRolls: number[];
      total: number;
    };

export type EncounterEventInput = EncounterEvent extends infer Event
  ? Event extends { id: string; at: string }
    ? Omit<Event, "id" | "at">
    : never
  : never;
