import type { LogEntry } from "../../models/types";

export type DbLogRow = {
  id: string;
  campaign_id: string | null;
  encounter_id: string | null;
  text: string;
  timestamp: string | null;
  created_at: string;
  source: "auto" | "manual" | null;
};

export function mapLogRow(row: DbLogRow): LogEntry {
  return {
    id: row.id,
    timestamp: row.timestamp ?? row.created_at,
    text: row.text,
    encounterId: row.encounter_id ?? undefined,
    campaignId: row.campaign_id ?? undefined,
    source: row.source ?? "manual",
  };
}

export function mapLogRows(rows: DbLogRow[]): LogEntry[] {
  return rows.map(mapLogRow);
}
