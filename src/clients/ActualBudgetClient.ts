import * as actual from "@actual-app/api";
import type {
  ActualBudgetConfig,
  ActualBudgetAccount,
  ActualTransaction,
  TestConnectionResult,
  ConnectionStatus,
  ImportResult,
} from "../types/actual-budget.js";

export class ActualBudgetClient {
  private isInitialized = false;

  async testConnection(
    serverUrl: string,
    password: string,
  ): Promise<TestConnectionResult> {
    try {
      if (this.isInitialized) {
        await actual.shutdown();
        this.isInitialized = false;
      }

      await actual.init({ serverURL: serverUrl, password });
      this.isInitialized = true;

      const budgets = await actual.getBudgets();

      return {
        success: true,
        message: `Connected! Found ${budgets.length} budget(s)`,
        budgets: budgets.map((b) => ({
          id: b.id || "",
          name: b.name || "Unnamed",
          groupId: b.groupId || "",
        })),
      };
    } catch (error: any) {
      if (error?.message?.includes("Authentication failed")) {
        return {
          success: false,
          message: "Authentication failed. Check your password.",
        };
      }
      return { success: false, message: error.message || "Connection failed" };
    }
  }

  async connect(config: ActualBudgetConfig): Promise<boolean> {
    try {
      if (this.isInitialized) {
        await actual.shutdown();
        this.isInitialized = false;
      }

      await actual.init({
        serverURL: config.serverUrl,
        password: config.password,
      });
      this.isInitialized = true;
      return true;
    } catch {
      return false;
    }
  }

  async getConnectionStatus(
    config: ActualBudgetConfig | null,
  ): Promise<ConnectionStatus> {
    if (!config) {
      return { configured: false, connected: false };
    }

    try {
      if (!this.isInitialized) {
        await actual.init({
          serverURL: config.serverUrl,
          password: config.password,
        });
        this.isInitialized = true;
      }

      return {
        configured: true,
        connected: true,
        serverUrl: config.serverUrl,
        syncId: config.syncId,
      };
    } catch {
      return {
        configured: true,
        connected: false,
        serverUrl: config.serverUrl,
        syncId: config.syncId,
      };
    }
  }

  async shutdown(): Promise<void> {
    if (this.isInitialized) {
      await actual.shutdown();
      this.isInitialized = false;
    }
  }

  async downloadBudget(syncId: string): Promise<void> {
    await actual.downloadBudget(syncId);
  }

  async getAccounts(): Promise<ActualBudgetAccount[]> {
    const accounts = await actual.getAccounts();
    return accounts.map((a) => ({ id: a.id, name: a.name }));
  }

  async createAccount(name: string): Promise<string | null> {
    try {
      return await actual.createAccount({ name });
    } catch (error: any) {
      console.error("Failed to create account:", error.message);
      return null;
    }
  }

  async importTransactions(
    accountId: string,
    transactions: ActualTransaction[],
  ): Promise<ImportResult> {
    try {
      const result = await actual.importTransactions(accountId, transactions);

      return {
        success: true,
        added: result.added.length,
        updated: result.updated.length,
        errors: (result.errors || []).map((e: any) => e.message || String(e)),
        message: `Imported ${result.added.length} new, updated ${result.updated.length} existing transactions`,
      };
    } catch (error: any) {
      return {
        success: false,
        added: 0,
        updated: 0,
        errors: [error.message],
        message: `Import failed: ${error.message}`,
      };
    }
  }

  async ensureConnected(config: ActualBudgetConfig): Promise<boolean> {
    if (!this.isInitialized) {
      const connected = await this.connect(config);
      if (!connected) return false;
    }
    await this.downloadBudget(config.syncId);
    return true;
  }
}
