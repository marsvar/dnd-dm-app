import type { EncounterEvent } from "../../engine/encounterEvents";

export type DbEncounterEventRow = {
  id: string;
  encounter_id: string;
  event: EncounterEvent;
  created_at: string;
};

export function mapEncounterEventRow(row: DbEncounterEventRow): EncounterEvent {
  return row.event;
}

export function mapEncounterEventRows(rows: DbEncounterEventRow[]): EncounterEvent[] {
  return rows.map(mapEncounterEventRow);
}
