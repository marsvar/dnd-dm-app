import type { AppState, CampaignMember, Encounter, EncounterBaseline, LogEntry, Note, Pc } from "../models/types";
import type { EncounterEvent } from "../engine/encounterEvents";
import { applyEncounterEvent } from "../engine/applyEncounterEvent.ts";
import { mapCampaignRows, type DbCampaignRow } from "../supabase/queries/campaigns.ts";
import { mapPcRows, type DbPcRow } from "../supabase/queries/pcs.ts";
import { mapEncounterRows, type DbEncounterRow } from "../supabase/queries/encounters.ts";
import { mapNoteRows, type DbNoteRow } from "../supabase/queries/notes.ts";
import { mapLogRows, type DbLogRow } from "../supabase/queries/log.ts";

export type DbPcAssignmentRow = {
  pc_id: string;
  campaign_id: string;
  user_id: string;
  assigned_at?: string;
};

export type DbEncounterEventRow = {
  encounter_id: string;
  event: EncounterEvent;
  created_at: string;
};

type BuildStateInput = {
  campaigns: DbCampaignRow[];
  pcs: DbPcRow[];
  pcAssignments: DbPcAssignmentRow[];
  encounters: DbEncounterRow[];
  encounterEvents: DbEncounterEventRow[];
  notes: DbNoteRow[];
  logEntries: DbLogRow[];
  seed?: AppState;
};

function rebuildEncounterFromEvents(
  baseline: EncounterBaseline,
  eventLog: EncounterEvent[]
): Encounter {
  const projected = eventLog.reduce(applyEncounterEvent, {
    ...baseline,
    eventLog: [],
  });
  return {
    ...projected,
    eventLog,
    eventLogBase: baseline,
  };
}

export function buildStateFromRows(input: BuildStateInput): AppState {
  const base: AppState =
    input.seed ??
    ({
      version: 0,
      monsters: [],
      pcs: [],
      encounters: [],
      notes: [],
      log: [],
      campaigns: [],
      campaignMembers: [],
      activeCampaignId: null,
    } satisfies AppState);
  const campaigns = mapCampaignRows(input.campaigns);
  const pcs = mapPcRows(input.pcs);
  const campaignMembers: CampaignMember[] = input.pcAssignments.map((row) => ({
    id: row.pc_id,
    campaignId: row.campaign_id,
    pcId: row.pc_id,
  }));

  const encounterBaselines = mapEncounterRows(input.encounters);
  const eventsByEncounter = new Map<string, EncounterEvent[]>();
  input.encounterEvents.forEach((row) => {
    const events = eventsByEncounter.get(row.encounter_id) ?? [];
    events.push(row.event);
    eventsByEncounter.set(row.encounter_id, events);
  });

  const encounters = encounterBaselines.map((baseline) => {
    const events = eventsByEncounter.get(baseline.id) ?? [];
    return rebuildEncounterFromEvents(baseline, events);
  });

  const notes = mapNoteRows(input.notes);
  const log = mapLogRows(input.logEntries);

  return {
    ...base,
    campaigns,
    pcs,
    campaignMembers,
    encounters,
    notes,
    log,
  };
}
