import type { EncounterBaseline } from "../../models/types";

export type DbEncounterRow = {
  id: string;
  campaign_id: string | null;
  name: string;
  location: string | null;
  status: "planned" | "active" | "completed";
  baseline: unknown | null;
  created_at: string;
};

export function mapEncounterRow(row: DbEncounterRow): EncounterBaseline {
  const baseline = (row.baseline ?? {}) as Partial<EncounterBaseline>;
  const status =
    row.status === "planned"
      ? "idle"
      : row.status === "active"
        ? "running"
        : "completed";

  return {
    id: row.id,
    name: row.name,
    location: row.location ?? undefined,
    campaignId: row.campaign_id ?? undefined,
    round: baseline.round ?? 1,
    isRunning: baseline.isRunning ?? false,
    combatMode: baseline.combatMode ?? "prep",
    status,
    activeParticipantId: baseline.activeParticipantId ?? null,
    participants: baseline.participants ?? [],
  };
}

export function mapEncounterRows(rows: DbEncounterRow[]): EncounterBaseline[] {
  return rows.map(mapEncounterRow);
}
