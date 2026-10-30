import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { updateClusters, updateClustersSync } from './ai/cluster';
import { evaluatePriority } from './ai/priority';

interface SeedReportItem {
  tracking_code: string;
  description: string;
  category: string;
  address: string;
  lat: number;
  lng: number;
  days_ago: number;
}

/**
 * Synchronously seeds the SQLite database with 45 realistic synthetic Bengaluru complaints
 * if the reports table is currently empty.
 *
 * @param db - SQLite Database connection instance
 * @param force - If true, re-seeds regardless of current row count
 * @returns True if seeding occurred, false if skipped
 */
export function seedDatabaseSync(db: Database.Database, force = false): boolean {
  const countRow = db.prepare('SELECT count(*) as count FROM reports').get() as { count: number };
  if (!force && countRow.count > 0) {
    return false;
  }

  const seedFilePath = path.join(process.cwd(), 'data', 'seed_reports.json');
  if (!fs.existsSync(seedFilePath)) {
    console.warn('seed_reports.json not found at', seedFilePath);
    return false;
  }

  const items = JSON.parse(fs.readFileSync(seedFilePath, 'utf-8')) as SeedReportItem[];

  const insertReport = db.prepare(`
    INSERT INTO reports (
      tracking_code,
      description,
      category,
      user_category,
      ai_category,
      lat,
      lng,
      address,
      priority_score,
      priority_label,
      priority_factors_json,
      summary,
      summary_source,
      duplicate_of,
      status,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertHistory = db.prepare(`
    INSERT INTO status_history (
      report_id,
      from_status,
      to_status,
      note,
      actor,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?)
  `);

  const now = Date.now();

  const tx = db.transaction(() => {
    if (force) {
      db.prepare('DELETE FROM status_history').run();
      db.prepare('DELETE FROM reports').run();
      db.prepare('DELETE FROM clusters').run();
    }

    const insertedIdsByTracking: Record<string, number> = {};

    for (const item of items) {
      const createdAt = new Date(now - item.days_ago * 86400000).toISOString();

      const evalResult = evaluatePriority({
        description: item.description,
        category: item.category,
        lat: item.lat,
        lng: item.lng,
        created_at: createdAt,
      });

      const summary = `Reported ${item.category.toLowerCase()} near ${item.address}: ${item.description}`;

      const res = insertReport.run(
        item.tracking_code,
        item.description,
        item.category,
        item.category,
        item.category,
        item.lat,
        item.lng,
        item.address,
        evalResult.score,
        evalResult.label,
        JSON.stringify(evalResult.factors),
        summary,
        'fallback',
        null,
        'Submitted',
        createdAt,
        createdAt
      );

      const reportId = Number(res.lastInsertRowid);
      insertedIdsByTracking[item.tracking_code] = reportId;

      insertHistory.run(
        reportId,
        'Submitted',
        'Submitted',
        'Initial report registered in municipal log',
        'System',
        createdAt
      );
    }

    // Link intentional near-duplicates
    if (insertedIdsByTracking['NS-KO0201'] && insertedIdsByTracking['NS-KO0202']) {
      db.prepare('UPDATE reports SET duplicate_of = ? WHERE id = ?').run(
        insertedIdsByTracking['NS-KO0201'],
        insertedIdsByTracking['NS-KO0202']
      );
    }

    if (insertedIdsByTracking['NS-IN0301'] && insertedIdsByTracking['NS-IN0302']) {
      db.prepare('UPDATE reports SET duplicate_of = ? WHERE id = ?').run(
        insertedIdsByTracking['NS-IN0301'],
        insertedIdsByTracking['NS-IN0302']
      );
    }
  });

  tx();

  // Run clustering synchronously
  updateClustersSync(db);
  return true;
}

export async function seedDatabaseIfEmpty(db: Database.Database, force = false): Promise<boolean> {
  const seeded = seedDatabaseSync(db, force);
  if (seeded && process.env.GEMINI_API_KEY) {
    await updateClusters(db);
  }
  return seeded;
}

export default seedDatabaseSync;
