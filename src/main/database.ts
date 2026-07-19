import Database from 'better-sqlite3';
import { app } from 'electron';
import * as path from 'path';

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    const dbPath = path.join(app.getPath('userData'), 'core-erp.db');
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    runMigrations(db);
  }
  return db;
}

export function closeDb(): void {
  if (db) {
    db.close();
  }
}

function runMigrations(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER PRIMARY KEY
    );
  `);

  const currentVersion = db
    .prepare('SELECT MAX(version) as v FROM schema_version')
    .get() as { v: number | null };
  const version = currentVersion?.v ?? 0;

  const migrations: (() => void)[] = [
    // Migration 1: Users table
    () => {
      db.exec(`
        CREATE TABLE users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL COLLATE NOCASE,
          name TEXT NOT NULL,
          password TEXT NOT NULL,
          pin TEXT NOT NULL DEFAULT '',
          role TEXT NOT NULL DEFAULT 'operator' CHECK(role IN ('admin', 'operator')),
          last_activity TEXT,
          status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
      `);
    },
    // Migration 2: Sessions table
    () => {
      db.exec(`
        CREATE TABLE sessions (
          id TEXT PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          created_at TEXT NOT NULL,
          expires_at TEXT NOT NULL
        );
        CREATE INDEX idx_sessions_user ON sessions(user_id);
        CREATE INDEX idx_sessions_expires ON sessions(expires_at);
      `);
    },
    // Migration 3: Settings table (key-value store)
    () => {
      db.exec(`
        CREATE TABLE settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
      `);
    },
    // Migration 4: API cache table
    () => {
      db.exec(`
        CREATE TABLE api_cache (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          cache_key TEXT UNIQUE NOT NULL,
          response_json TEXT NOT NULL,
          cached_at TEXT NOT NULL,
          expires_at TEXT
        );
        CREATE INDEX idx_api_cache_key ON api_cache(cache_key);
        CREATE INDEX idx_api_cache_expires ON api_cache(expires_at);
      `);
    },
  ];

  for (let i = version; i < migrations.length; i++) {
    const migrationFn = migrations[i];
    db.transaction(() => {
      migrationFn();
      db.prepare('INSERT INTO schema_version (version) VALUES (?)').run(i + 1);
    })();
    console.log(`[db] Applied migration ${i + 1}`);
  }
}
