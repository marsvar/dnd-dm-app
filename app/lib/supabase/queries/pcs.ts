import type { Pc } from "../../models/types";

export type DbPcRow = {
  id: string;
  campaign_id: string;
  name: string;
  data: unknown;
  created_by: string;
  created_at: string;
};

export function mapPcRow(row: DbPcRow): Pc {
  const base = (row.data ?? {}) as Partial<Pc>;
  return {
    ...base,
    id: row.id,
    name: row.name,
  } as Pc;
}

export function mapPcRows(rows: DbPcRow[]): Pc[] {
  return rows.map(mapPcRow);
}
