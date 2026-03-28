import type { Campaign } from "../../models/types";

export type DbCampaignRow = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
};

export function mapCampaignRow(row: DbCampaignRow): Campaign {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    createdAt: row.created_at,
  };
}

export function mapCampaignRows(rows: DbCampaignRow[]): Campaign[] {
  return rows.map(mapCampaignRow);
}
