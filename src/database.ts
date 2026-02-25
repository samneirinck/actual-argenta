import Database from "better-sqlite3";
import { existsSync, mkdirSync } from "fs";
import { runMigrations } from "./migrations/index.js";
import { ConfigRepository } from "./repositories/ConfigRepository.js";
import { AccountRepository } from "./repositories/AccountRepository.js";

const DATA_DIR = "data";
const DB_PATH = `${DATA_DIR}/argenta.db`;

function ensureDataDir() {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

ensureDataDir();
const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");

runMigrations(db);

export const configRepository = new ConfigRepository(db);
export const accountRepository = new AccountRepository(db);

export { type ActualBudgetConfig } from "./types/actual-budget.js";

