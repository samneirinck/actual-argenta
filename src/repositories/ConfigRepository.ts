import type Database from "better-sqlite3";
import type { ActualBudgetConfig } from "../types/actual-budget.js";

export class ConfigRepository {
  constructor(private db: Database.Database) {}

  get(key: string): string | null {
    const row = this.db.prepare("SELECT value FROM config WHERE key = ?").get(key) as { value: string } | undefined;
    return row?.value ?? null;
  }

  set(key: string, value: string): void {
    this.db.prepare("INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)").run(key, value);
  }

  getLastLoginTime(): string | null {
    return this.get("lastLoginTime");
  }

  getLastLoginSuccess(): boolean | null {
    const val = this.get("lastLoginSuccess");
    return val === null ? null : val === "true";
  }

  getLastError(): string | null {
    return this.get("lastError");
  }

  setLoginSuccess(): void {
    this.set("lastLoginTime", new Date().toISOString());
    this.set("lastLoginSuccess", "true");
    this.set("lastError", "");
  }

  setLoginError(error: string): void {
    this.set("lastLoginTime", new Date().toISOString());
    this.set("lastLoginSuccess", "false");
    this.set("lastError", error);
  }

  getActualBudgetConfig(): ActualBudgetConfig | null {
    const serverUrl = this.get("actualServerUrl");
    const password = this.get("actualPassword");
    const syncId = this.get("actualSyncId");
    if (!serverUrl || !password || !syncId) return null;
    return { serverUrl, password, syncId };
  }

  setActualBudgetConfig(config: ActualBudgetConfig): void {
    this.set("actualServerUrl", config.serverUrl);
    this.set("actualPassword", config.password);
    this.set("actualSyncId", config.syncId);
  }
}

