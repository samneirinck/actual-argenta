import Database from "better-sqlite3";

export function createTestDb(): Database.Database {
  const db = new Database(":memory:");

  db.exec(`
    CREATE TABLE IF NOT EXISTS config (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      iban TEXT UNIQUE NOT NULL,
      alias TEXT NOT NULL,
      last_sync_time TEXT,
      actual_account_id TEXT,
      last_synced_row_count INTEGER DEFAULT 0
    );
  `);

  return db;
}

