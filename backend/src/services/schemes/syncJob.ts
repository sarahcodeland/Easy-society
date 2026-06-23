import { pool } from '../../db/pool';

// Periodic job (run via cron/PM2 cron or an AWS EventBridge-triggered Lambda
// in production) that pulls scheme data from myscheme.gov.in and other
// official government sources and upserts into the `schemes` table. Schemes
// are never user-editable — this job is the only writer.
//
// myscheme.gov.in does not currently expose a public, documented REST API,
// so the real implementation will likely need a combination of: (a) any
// official data.gov.in datasets that mirror scheme listings, and (b) a
// server-side fetch+parse of myscheme.gov.in's own listing/detail pages
// (respecting robots.txt/ToS). Stubbed here with a no-op so the read-only
// API and DB shape are ready to receive real data once that source is wired up.
export async function syncGovernmentSchemes(): Promise<{ upserted: number }> {
  // eslint-disable-next-line no-console
  console.log('[syncGovernmentSchemes] stub run — no real source configured yet');
  void pool; // keep import for when the real upsert is implemented
  return { upserted: 0 };
}
