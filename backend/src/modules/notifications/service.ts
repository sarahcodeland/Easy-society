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
    `INSERT INTO notifications (user_id, type, reference_id, reference_type, body) VALUES ($1, $2, $3, $4, $5)`,
    [input.userId, input.type, input.referenceId ?? null, input.referenceType ?? null, input.pushBody],
  );

  const tokens = await pool.query('SELECT token FROM device_tokens WHERE user_id = $1', [input.userId]);
  if (tokens.rows.length > 0) {
    await getPushProvider().sendToTokens(
      tokens.rows.map((r) => r.token),
      { title: input.pushTitle, body: input.pushBody, data: { type: input.type, reference_id: input.referenceId ?? '' } },
    );
  }
}

// Fire-and-forget wrapper for request handlers: a notification or push
// failure must never fail the action that triggered it. Skips self-notifies
// and authorless content (userId null after account deletion).
export function notifyInBackground(
  input: Omit<Parameters<typeof notifyUser>[0], 'userId'> & { userId: string | null | undefined; actorId: string },
): void {
  if (!input.userId || input.userId === input.actorId) return;
  const { actorId: _actorId, ...rest } = input;
  notifyUser({ ...rest, userId: input.userId }).catch((err) => {
    // eslint-disable-next-line no-console
    console.error('notifyUser failed', err);
  });
}
