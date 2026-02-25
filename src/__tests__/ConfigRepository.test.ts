import { describe, it, expect, beforeEach } from "vitest";
import { ConfigRepository } from "../repositories/ConfigRepository.js";
import { createTestDb } from "./testDb.js";
import type Database from "better-sqlite3";

describe("ConfigRepository", () => {
  let db: Database.Database;
  let repo: ConfigRepository;

  beforeEach(() => {
    db = createTestDb();
    repo = new ConfigRepository(db);
  });

  describe("get/set", () => {
    it("returns null for missing key", () => {
      expect(repo.get("nonexistent")).toBeNull();
    });

    it("stores and retrieves a value", () => {
      repo.set("testKey", "testValue");

      expect(repo.get("testKey")).toBe("testValue");
    });

    it("overwrites existing value", () => {
      repo.set("key", "value1");
      repo.set("key", "value2");

      expect(repo.get("key")).toBe("value2");
    });
  });

  describe("login status", () => {
    it("returns null for last login time when not set", () => {
      expect(repo.getLastLoginTime()).toBeNull();
    });

    it("returns null for last login success when not set", () => {
      expect(repo.getLastLoginSuccess()).toBeNull();
    });

    it("setLoginSuccess updates all fields", () => {
      repo.setLoginSuccess();

      expect(repo.getLastLoginTime()).not.toBeNull();
      expect(repo.getLastLoginSuccess()).toBe(true);
      expect(repo.getLastError()).toBe("");
    });

    it("setLoginError updates all fields", () => {
      repo.setLoginError("Connection timeout");

      expect(repo.getLastLoginTime()).not.toBeNull();
      expect(repo.getLastLoginSuccess()).toBe(false);
      expect(repo.getLastError()).toBe("Connection timeout");
    });
  });

  describe("Actual Budget config", () => {
    it("returns null when not configured", () => {
      expect(repo.getActualBudgetConfig()).toBeNull();
    });

    it("returns null when partially configured", () => {
      repo.set("actualServerUrl", "https://actual.example.com");

      expect(repo.getActualBudgetConfig()).toBeNull();
    });

    it("stores and retrieves full config", () => {
      const config = {
        serverUrl: "https://actual.example.com",
        password: "secret123",
        syncId: "sync-abc-123",
      };

      repo.setActualBudgetConfig(config);

      expect(repo.getActualBudgetConfig()).toEqual(config);
    });

    it("updates existing config", () => {
      repo.setActualBudgetConfig({
        serverUrl: "https://old.example.com",
        password: "old",
        syncId: "old-sync",
      });

      const newConfig = {
        serverUrl: "https://new.example.com",
        password: "new",
        syncId: "new-sync",
      };
      repo.setActualBudgetConfig(newConfig);

      expect(repo.getActualBudgetConfig()).toEqual(newConfig);
    });
  });
});

