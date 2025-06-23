import { sql } from 'drizzle-orm';

/**
 * Convert Supabase UUID to numeric user id using a subquery.
 */
export function uuidToId(uuid: string) {
  return sql<number>`(SELECT id FROM users WHERE auth_user_id = ${uuid})`;
}
