import { NotificationType } from '@easysociety/shared';
import { pool } from '../../db/pool';
import { getPushProvider } from '../../services/push';

// Single entry point for creating a notification + best-effort push. Called
// by other modules (chat replies, Q&A upvotes/recommendations, announcements)
// rather than each module touching the notifications table directly.
export async function notifyUser(input: {
  userId: string;
  type: NotificationType;
  referenceId?: string;
  referenceType?: string;
  pushTitle: string;
  pushBody: string;
}): Promise<void> {
  await pool.query(
    `INSERT INTO notifications (user_id, type, reference_id, reference_type) VALUES ($1, $2, $3, $4)`,
    [input.userId, input.type, input.referenceId ?? null, input.referenceType ?? null],
  );

  const tokens = await pool.query('SELECT token FROM device_tokens WHERE user_id = $1', [input.userId]);
  if (tokens.rows.length > 0) {
    await getPushProvider().sendToTokens(
      tokens.rows.map((r) => r.token),
      { title: input.pushTitle, body: input.pushBody, data: { type: input.type, reference_id: input.referenceId ?? '' } },
    );
  }
}
