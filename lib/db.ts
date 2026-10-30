import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { seedDatabaseSync } from './seed';

/**
 * SQLite database helper for NagarSetu.
 * Initializes the database connection, creates required directories,
 * and sets up tables defined in PLAN.md.
 */

const DATA_DIR = path.join(process.cwd(), 'data');
const UPLOADS_DIR = path.join(process.cwd(), 'data', 'uploads');
const DB_PATH = path.join(process.cwd(), 'data', 'nagarsetu.db');

function ensureDirectoriesExist(): void {
  if (!fs.existsSync(/* turbopackIgnore: true */ DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(/* turbopackIgnore: true */ UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    const gitkeepPath = path.join(UPLOADS_DIR, '.gitkeep');
    if (!fs.existsSync(/* turbopackIgnore: true */ gitkeepPath)) {
      fs.writeFileSync(gitkeepPath, '');
    }
  }
}

// Preserve connection instance across HMR in development
declare global {
  var __nagarsetu_db: Database.Database | undefined;
}

export function initDb(db: Database.Database): void {
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // 1. Clusters table
  db.exec(`
    CREATE TABLE IF NOT EXISTS clusters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      centroid_lat REAL NOT NULL,
      centroid_lng REAL NOT NULL,
      radius_m REAL NOT NULL DEFAULT 300,
      report_count INTEGER NOT NULL DEFAULT 0,
      top_categories TEXT,
      brief TEXT,
      brief_source TEXT NOT NULL DEFAULT 'fallback',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // 2. Reports table
  db.exec(`
    CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tracking_code TEXT NOT NULL UNIQUE,
      description TEXT NOT NULL,
      image_path TEXT,
      category TEXT NOT NULL,
      user_category TEXT,
      ai_category TEXT,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      address TEXT,
      priority_score INTEGER NOT NULL DEFAULT 0,
      priority_label TEXT NOT NULL DEFAULT 'Low',
      priority_factors_json TEXT,
      summary TEXT,
      summary_source TEXT NOT NULL DEFAULT 'fallback',
      duplicate_of INTEGER REFERENCES reports(id) ON DELETE SET NULL,
      cluster_id INTEGER REFERENCES clusters(id) ON DELETE SET NULL,
      status TEXT NOT NULL DEFAULT 'Submitted',
      assignee TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_reports_tracking_code ON reports(tracking_code);
    CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
    CREATE INDEX IF NOT EXISTS idx_reports_cluster_id ON reports(cluster_id);
    CREATE INDEX IF NOT EXISTS idx_reports_duplicate_of ON reports(duplicate_of);
  `);

  // 3. Status History table
  db.exec(`
    CREATE TABLE IF NOT EXISTS status_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      report_id INTEGER NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
      from_status TEXT NOT NULL,
      to_status TEXT NOT NULL,
      note TEXT,
      actor TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_status_history_report_id ON status_history(report_id);
  `);
}

export function getDb(): Database.Database {
  if (!global.__nagarsetu_db) {
    ensureDirectoriesExist();
    const db = new Database(DB_PATH);
    initDb(db);
    seedDatabaseSync(db);
    global.__nagarsetu_db = db;
  }
  return global.__nagarsetu_db;
}

export default getDb;
