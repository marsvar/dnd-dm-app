import type { Note } from "../../models/types";

export type DbNoteRow = {
  id: string;
  campaign_id: string | null;
  title: string;
  body: string;
  tags: string[] | null;
  created_at: string;
};

export function mapNoteRow(row: DbNoteRow): Note {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    tags: row.tags ?? [],
    createdAt: row.created_at,
    campaignId: row.campaign_id ?? undefined,
  };
}

export function mapNoteRows(rows: DbNoteRow[]): Note[] {
  return rows.map(mapNoteRow);
}
