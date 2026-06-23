import { pool } from '../db/pool';
import { VisitorTag } from '@easysociety/shared';

// Mirrors db function is_visitor()/visitor_location_label() — kept as a
// batchable JS helper too so list endpoints (chat history, Q&A feed,
// marketplace feed) can attach the visitor tag to many rows in one query
// instead of calling the SQL function per row.
export async function attachVisitorTags<T extends { location_id: string | null }>(
  rows: T[],
  viewerLocationId: string | null,
): Promise<(T & VisitorTag)[]> {
  if (rows.length === 0) return [];

  const distinctLocationIds = [...new Set(rows.map((r) => r.location_id).filter(Boolean))] as string[];
  let labels = new Map<string, string>();
  if (distinctLocationIds.length > 0) {
    const { rows: locRows } = await pool.query<{ id: string; name: string }>(
      'SELECT id, name FROM locations WHERE id = ANY($1)',
      [distinctLocationIds],
    );
    labels = new Map(locRows.map((l) => [l.id, l.name]));
  }

  return rows.map((row) => {
    const isVisitor = !!row.location_id && row.location_id !== viewerLocationId;
    return {
      ...row,
      is_visitor: isVisitor,
      visitor_location_label: isVisitor ? labels.get(row.location_id as string) ?? null : null,
    };
  });
}

export function isVisitorOf(contentLocationId: string | null, viewerLocationId: string | null): boolean {
  return !!contentLocationId && contentLocationId !== viewerLocationId;
}
