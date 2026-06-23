import { Pool, PoolClient, QueryResultRow } from 'pg';
import { env } from '../config/env';

// In production this DATABASE_URL should point at PgBouncer (transaction
// pooling mode), not Postgres directly. PgBouncer absorbs the connection
// churn from N horizontally-scaled API instances so Postgres itself only
// ever sees a small, stable pool of backend connections — this is what
// makes 50k-1M concurrent users feasible against a single primary.
export const pool = new Pool({
  connectionString: env.databaseUrl,
  max: env.nodeEnv === 'production' ? 20 : 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

pool.on('error', (err) => {
  // eslint-disable-next-line no-console
  console.error('Unexpected PG pool error', err);
});

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
) {
  return pool.query<T>(text, params);
}

export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
