import type { ImportResult } from "./actual-budget.js";

export interface Account {
  id: string;
  iban: string;
  alias: string;
  lastSyncTime: string | null;
  actualAccountId: string | null;
  lastSyncedRowCount: number;
}

export interface SyncStatus {
  lastLoginTime: string | null;
  lastLoginSuccess: boolean | null;
  lastError: string | null;
  accounts: Account[];
}

export interface SyncResult {
  success: boolean;
  message: string;
  movementCount?: number;
  actualBudget?: ImportResult;
  needsAccountLink?: boolean;
  needsReauth?: boolean;
}

