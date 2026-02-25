import type { ImportTransactionEntity } from "@actual-app/api/@types/loot-core/src/types/models/import-transaction";

export interface ActualBudgetConfig {
  serverUrl: string;
  password: string;
  syncId: string;
}

export interface ActualBudgetAccount {
  id: string;
  name: string;
}

export type ActualTransaction = ImportTransactionEntity;

export interface BudgetInfo {
  id: string;
  name: string;
  groupId: string;
}

export interface TestConnectionResult {
  success: boolean;
  message: string;
  budgets?: BudgetInfo[];
}

export interface ImportResult {
  success: boolean;
  added: number;
  updated: number;
  errors: string[];
  message: string;
}

export interface ConnectionStatus {
  configured: boolean;
  connected: boolean;
  serverUrl?: string;
  syncId?: string;
}
