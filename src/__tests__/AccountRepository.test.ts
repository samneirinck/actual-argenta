import { describe, it, expect, beforeEach } from "vitest";
import { AccountRepository } from "../repositories/AccountRepository.js";
import { createTestDb } from "./testDb.js";
import type Database from "better-sqlite3";

describe("AccountRepository", () => {
  let db: Database.Database;
  let repo: AccountRepository;

  beforeEach(() => {
    db = createTestDb();
    repo = new AccountRepository(db);
  });

  describe("findAll", () => {
    it("returns empty array when no accounts", () => {
      expect(repo.findAll()).toEqual([]);
    });

    it("returns all accounts", () => {
      repo.upsertFromArgenta([
        { id: "acc1", iban: "BE11111111111111", alias: "Account 1" },
        { id: "acc2", iban: "BE22222222222222", alias: "Account 2" },
      ]);

      const accounts = repo.findAll();

      expect(accounts).toHaveLength(2);
      expect(accounts.map((a) => a.id)).toContain("acc1");
      expect(accounts.map((a) => a.id)).toContain("acc2");
    });
  });

  describe("findById", () => {
    it("returns null for non-existent account", () => {
      expect(repo.findById("nonexistent")).toBeNull();
    });

    it("returns account by id", () => {
      repo.upsertFromArgenta([{ id: "acc1", iban: "BE11111111111111", alias: "My Account" }]);

      const account = repo.findById("acc1");

      expect(account).not.toBeNull();
      expect(account?.iban).toBe("BE11111111111111");
      expect(account?.alias).toBe("My Account");
    });
  });

  describe("findByIban", () => {
    it("returns null for non-existent iban", () => {
      expect(repo.findByIban("BE99999999999999")).toBeNull();
    });

    it("returns account by iban", () => {
      repo.upsertFromArgenta([{ id: "acc1", iban: "BE11111111111111", alias: "My Account" }]);

      const account = repo.findByIban("BE11111111111111");

      expect(account).not.toBeNull();
      expect(account?.id).toBe("acc1");
    });
  });

  describe("upsertFromArgenta", () => {
    it("inserts new accounts", () => {
      repo.upsertFromArgenta([{ id: "acc1", iban: "BE11111111111111", alias: "Account 1" }]);

      const account = repo.findById("acc1");
      expect(account).not.toBeNull();
      expect(account?.lastSyncTime).toBeNull();
      expect(account?.actualAccountId).toBeNull();
      expect(account?.lastSyncedRowCount).toBe(0);
    });

    it("updates existing account alias and iban", () => {
      repo.upsertFromArgenta([{ id: "acc1", iban: "BE11111111111111", alias: "Old Alias" }]);
      repo.upsertFromArgenta([{ id: "acc1", iban: "BE99999999999999", alias: "New Alias" }]);

      const account = repo.findById("acc1");
      expect(account?.alias).toBe("New Alias");
      expect(account?.iban).toBe("BE99999999999999");
    });

    it("preserves linked actual account on upsert", () => {
      repo.upsertFromArgenta([{ id: "acc1", iban: "BE11111111111111", alias: "Account 1" }]);
      repo.linkActualAccount("acc1", "actual-123");

      repo.upsertFromArgenta([{ id: "acc1", iban: "BE11111111111111", alias: "Updated" }]);

      expect(repo.getActualAccountId("acc1")).toBe("actual-123");
    });
  });

  describe("linkActualAccount", () => {
    it("links an actual account id", () => {
      repo.upsertFromArgenta([{ id: "acc1", iban: "BE11111111111111", alias: "Account 1" }]);

      repo.linkActualAccount("acc1", "actual-budget-id");

      expect(repo.getActualAccountId("acc1")).toBe("actual-budget-id");
    });

    it("updates existing link", () => {
      repo.upsertFromArgenta([{ id: "acc1", iban: "BE11111111111111", alias: "Account 1" }]);
      repo.linkActualAccount("acc1", "old-id");

      repo.linkActualAccount("acc1", "new-id");

      expect(repo.getActualAccountId("acc1")).toBe("new-id");
    });
  });

  describe("updateSyncStatus", () => {
    it("updates last sync time", () => {
      repo.upsertFromArgenta([{ id: "acc1", iban: "BE11111111111111", alias: "Account 1" }]);

      repo.updateSyncStatus("acc1");

      const account = repo.findById("acc1");
      expect(account?.lastSyncTime).not.toBeNull();
    });

    it("updates row count when provided", () => {
      repo.upsertFromArgenta([{ id: "acc1", iban: "BE11111111111111", alias: "Account 1" }]);

      repo.updateSyncStatus("acc1", 500);

      expect(repo.getLastSyncedRowCount("acc1")).toBe(500);
    });
  });

  describe("getLastSyncedRowCount", () => {
    it("returns 0 for new account", () => {
      repo.upsertFromArgenta([{ id: "acc1", iban: "BE11111111111111", alias: "Account 1" }]);

      expect(repo.getLastSyncedRowCount("acc1")).toBe(0);
    });

    it("returns 0 for non-existent account", () => {
      expect(repo.getLastSyncedRowCount("nonexistent")).toBe(0);
    });
  });
});

