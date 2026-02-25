import { writeFileSync } from "fs";
import { ArgentaClient } from "../clients/ArgentaClient.js";
import { ActualBudgetClient } from "../clients/ActualBudgetClient.js";
import { TransactionMapper } from "./TransactionMapper.js";
import { ConfigRepository } from "../repositories/ConfigRepository.js";
import { AccountRepository } from "../repositories/AccountRepository.js";
import type { SyncResult } from "../types/sync.js";
import type { ArgentaMovement } from "../types/argenta.js";

interface SyncState {
  inProgress: boolean;
}

export class SyncService {
  private state: SyncState = { inProgress: false };

  constructor(
    private argentaClient: ArgentaClient,
    private actualBudgetClient: ActualBudgetClient,
    private configRepo: ConfigRepository,
    private accountRepo: AccountRepository,
    private transactionMapper: TransactionMapper = new TransactionMapper()
  ) {}

  getSyncState() {
    return { inProgress: this.state.inProgress };
  }

  async startLogin(): Promise<void> {
    if (this.state.inProgress) {
      console.log("Sync already in progress");
      return;
    }

    this.state.inProgress = true;
    console.log("Starting login process...");

    try {
      await this.argentaClient.startLoginSession();
      console.log("Waiting for user to login via VNC...");

      const result = await this.argentaClient.waitForValidSession();

      if (result.success && result.accounts) {
        this.configRepo.setLoginSuccess();
        this.accountRepo.upsertFromArgenta(result.accounts);
        console.log(`Login successful! Found ${result.accounts.length} accounts`);
      } else {
        this.configRepo.setLoginError(result.error || "Login failed");
        console.error("Login failed:", result.error);
      }
    } catch (error: any) {
      console.error("Login failed:", error.message);
      this.configRepo.setLoginError(error.message);
    } finally {
      await this.argentaClient.closeLoginSession();
      this.state.inProgress = false;
    }
  }

  async syncAccount(accountId: string, fullSync: boolean = false): Promise<SyncResult> {
    if (!this.argentaClient.isAuthenticated()) {
      return { success: false, message: "Not authenticated. Please login first." };
    }

    const account = this.accountRepo.findById(accountId);
    if (!account) {
      return { success: false, message: "Account not found" };
    }

    const actualAccountId = this.accountRepo.getActualAccountId(accountId);
    if (!actualAccountId) {
      return { success: false, message: "Account not linked to Actual Budget", needsAccountLink: true };
    }

    const lastSyncedRowCount = this.accountRepo.getLastSyncedRowCount(accountId);
    console.log(`Syncing account ${account.iban} (${fullSync ? "full" : "incremental"}, last synced: ${lastSyncedRowCount} rows)...`);

    const initialResult = await this.argentaClient.fetchMovements(account.iban, 0, 1);
    if (!initialResult.success) {
      return { success: false, message: initialResult.error || "Failed to fetch movements", needsReauth: initialResult.needsReauth };
    }

    const totalRowCount = initialResult.totalRowCount || 0;
    let newMovementsToFetch = 0;

    if (!fullSync && lastSyncedRowCount > 0) {
      newMovementsToFetch = totalRowCount - lastSyncedRowCount;
      if (newMovementsToFetch <= 0) {
        console.log("No new movements to sync");
        return { success: true, message: "No new movements to sync", movementCount: 0 };
      }
      console.log(`Found ${newMovementsToFetch} new movements to fetch`);
    }

    const allMovements: ArgentaMovement[] = [];
    let start = 0;
    const maxResults = 200;
    const maxToFetch = fullSync ? Infinity : newMovementsToFetch || Infinity;

    while (allMovements.length < maxToFetch) {
      const result = await this.argentaClient.fetchMovements(account.iban, start, maxResults);
      if (!result.success || !result.movements) {
        return { success: false, message: result.error || "Failed to fetch movements", needsReauth: result.needsReauth };
      }

      if (!fullSync && newMovementsToFetch > 0) {
        const remaining = newMovementsToFetch - allMovements.length;
        allMovements.push(...result.movements.slice(0, remaining));
      } else {
        allMovements.push(...result.movements);
      }

      console.log(`Fetched ${start} to ${start + result.movements.length} of ${totalRowCount}`);

      if (result.movements.length < maxResults) break;
      start += maxResults;
    }

    console.log(`Total movements fetched: ${allMovements.length}`);
    this.logMovementsSummary(allMovements);
    this.saveSyncDebugFile(account.iban, allMovements, fullSync);

    const importResult = await this.importToActualBudget(actualAccountId, allMovements);
    this.accountRepo.updateSyncStatus(accountId, totalRowCount);

    return {
      success: true,
      message: importResult.success
        ? `Synced ${allMovements.length} movements. ${importResult.message}`
        : `Fetched ${allMovements.length} movements but Actual Budget import failed: ${importResult.message}`,
      movementCount: allMovements.length,
      actualBudget: importResult,
    };
  }

  private async importToActualBudget(actualAccountId: string, movements: ArgentaMovement[]) {
    const config = this.configRepo.getActualBudgetConfig();
    if (!config) {
      return { success: false, added: 0, updated: 0, errors: ["Actual Budget not configured"], message: "Actual Budget not configured" };
    }

    const connected = await this.actualBudgetClient.ensureConnected(config);
    if (!connected) {
      return { success: false, added: 0, updated: 0, errors: ["Failed to connect"], message: "Failed to connect to Actual Budget" };
    }

    const transactions = this.transactionMapper.mapMovementsToTransactions(movements, actualAccountId);
    return await this.actualBudgetClient.importTransactions(actualAccountId, transactions);
  }

  private logMovementsSummary(movements: ArgentaMovement[]): void {
    console.log("\n=== MOVEMENTS SUMMARY ===");
    movements.slice(0, 10).forEach((m) => {
      console.log(`${m.accountingDate} | ${m.movementSign}${m.movementAmount} | ${m.counterpartyName || m.standardWording}`);
    });
    if (movements.length > 10) {
      console.log(`... and ${movements.length - 10} more`);
    }
    console.log("=========================\n");
  }

  private saveSyncDebugFile(iban: string, movements: ArgentaMovement[], fullSync: boolean): void {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const sanitizedIban = iban.replace(/\s/g, "");
    const filename = `data/movements/sync-${sanitizedIban}-${fullSync ? "full" : "incremental"}-${timestamp}.json`;

    const debugData = {
      syncTime: new Date().toISOString(),
      iban,
      fullSync,
      totalMovements: movements.length,
      movements,
    };

    try {
      writeFileSync(filename, JSON.stringify(debugData, null, 2));
      console.log(`Debug data saved to ${filename}`);
    } catch (error: any) {
      console.error(`Failed to save debug file: ${error.message}`);
    }
  }
}

