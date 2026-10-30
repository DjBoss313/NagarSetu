import Database from 'better-sqlite3';

/**
 * Generates tracking codes in the format: NS- plus 6 random alphanumeric characters.
 * Non-sequential and retries on collision per PLAN.md.
 */
export function generateTrackingCode(db: Database.Database): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let attempts = 0;

  while (attempts < 100) {
    attempts++;
    let code = 'NS-';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const existing = db
      .prepare('SELECT id FROM reports WHERE tracking_code = ?')
      .get(code);

    if (!existing) {
      return code;
    }
  }

  // Graceful fallback on extreme collision
  return `NS-${Date.now().toString(36).toUpperCase().slice(-6)}`;
}
