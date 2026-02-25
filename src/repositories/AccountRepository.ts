import type Database from "better-sqlite3";
import type { Account } from "../types/sync.js";
import type { ArgentaAccount } from "../types/argenta.js";

interface AccountRow {
  id: string;
  iban: string;
  alias: string;
  last_sync_time: string | null;
  actual_account_id: string | null;
  last_synced_row_count: number;
}

export class AccountRepository {
  constructor(private db: Database.Database) {}

  private mapRow(row: AccountRow): Account {
    return {
      id: row.id,
      iban: row.iban,
      alias: row.alias,
      lastSyncTime: row.last_sync_time,
      actualAccountId: row.actual_account_id,
      lastSyncedRowCount: row.last_synced_row_count || 0,
    };
  }

  findAll(): Account[] {
    const rows = this.db.prepare("SELECT * FROM accounts").all() as AccountRow[];
    return rows.map((r) => this.mapRow(r));
  }

  findById(id: string): Account | null {
    const row = this.db.prepare("SELECT * FROM accounts WHERE id = ?").get(id) as AccountRow | undefined;
    if (!row) return null;
    return this.mapRow(row);
  }

  findByIban(iban: string): Account | null {
    const row = this.db.prepare("SELECT * FROM accounts WHERE iban = ?").get(iban) as AccountRow | undefined;
    if (!row) return null;
    return this.mapRow(row);
  }

  upsertFromArgenta(accounts: ArgentaAccount[]): void {
    const upsert = this.db.prepare(`
      INSERT INTO accounts (id, iban, alias, last_sync_time, actual_account_id, last_synced_row_count)
      VALUES (?, ?, ?, NULL, NULL, 0)
      ON CONFLICT(id) DO UPDATE SET iban = excluded.iban, alias = excluded.alias
    `);

    for (const acc of accounts) {
      upsert.run(acc.id, acc.iban, acc.alias);
    }
  }

  updateSyncStatus(id: string, rowCount?: number): void {
    if (rowCount !== undefined) {
      this.db.prepare("UPDATE accounts SET last_sync_time = ?, last_synced_row_count = ? WHERE id = ?")
        .run(new Date().toISOString(), rowCount, id);
    } else {
      this.db.prepare("UPDATE accounts SET last_sync_time = ? WHERE id = ?")
        .run(new Date().toISOString(), id);
    }
  }

  linkActualAccount(argentaAccountId: string, actualAccountId: string): void {
    this.db.prepare("UPDATE accounts SET actual_account_id = ? WHERE id = ?")
      .run(actualAccountId, argentaAccountId);
  }

  unlinkActualAccount(argentaAccountId: string): void {
    this.db.prepare("UPDATE accounts SET actual_account_id = NULL, last_synced_row_count = 0 WHERE id = ?")
      .run(argentaAccountId);
  }

  getActualAccountId(argentaAccountId: string): string | null {
    const row = this.db.prepare("SELECT actual_account_id FROM accounts WHERE id = ?")
      .get(argentaAccountId) as { actual_account_id: string | null } | undefined;
    return row?.actual_account_id ?? null;
  }

  getLastSyncedRowCount(accountId: string): number {
    const row = this.db.prepare("SELECT last_synced_row_count FROM accounts WHERE id = ?")
      .get(accountId) as { last_synced_row_count: number } | undefined;
    return row?.last_synced_row_count || 0;
  }
}

