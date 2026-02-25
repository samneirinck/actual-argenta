import { describe, it, expect } from "vitest";
import { TransactionMapper } from "../services/TransactionMapper.js";
import type { ArgentaMovement } from "../types/argenta.js";

function createMovement(overrides: Partial<ArgentaMovement> = {}): ArgentaMovement {
  return {
    accountNumber: "BE66973087048743",
    accountingDate: "20260215",
    communicationPart1: "Payment for groceries",
    communicationPart2: "",
    counterPartyAccountNumber: "BE12345678901234",
    counterpartyName: "Colruyt",
    identifier: "ID001",
    isRejectable: false,
    movementAmount: 125.50,
    movementSign: "-",
    operationCounterparty: "",
    operationDate: "20260215",
    operationReference: "REF123",
    orderAmount: 125.50,
    pispParticipantName: "",
    rejectionIdentifier: "",
    standardWording: "Purchase",
    structuredCommunicationSwitch: "",
    valueDate: "20260215",
    ...overrides,
  };
}

describe("TransactionMapper", () => {
  const mapper = new TransactionMapper();
  const accountId = "actual-account-123";

  describe("mapMovementToTransaction", () => {
    it("maps a debit movement correctly", () => {
      const movement = createMovement({ movementSign: "-", movementAmount: 125.50 });

      const result = mapper.mapMovementToTransaction(movement, accountId);

      expect(result.account).toBe(accountId);
      expect(result.amount).toBe(-12550);
      expect(result.payee_name).toBe("Colruyt");
    });

    it("maps a credit movement correctly", () => {
      const movement = createMovement({
        movementSign: "+",
        movementAmount: 500.00,
        counterpartyName: "Employer Inc",
        communicationPart1: "Salary",
      });

      const result = mapper.mapMovementToTransaction(movement, accountId);

      expect(result.amount).toBe(50000);
      expect(result.payee_name).toBe("Employer Inc");
      expect(result.notes).toBe("Salary");
    });

    it("formats date from YYYYMMDD to YYYY-MM-DD", () => {
      const movement = createMovement({ accountingDate: "20260218" });

      const result = mapper.mapMovementToTransaction(movement, accountId);

      expect(result.date).toBe("2026-02-18");
    });

    it("keeps date unchanged if already formatted", () => {
      const movement = createMovement({ accountingDate: "2026-02-18" });

      const result = mapper.mapMovementToTransaction(movement, accountId);

      expect(result.date).toBe("2026-02-18");
    });

    it("combines communication parts into notes", () => {
      const movement = createMovement({
        communicationPart1: "Part one",
        communicationPart2: "Part two",
      });

      const result = mapper.mapMovementToTransaction(movement, accountId);

      expect(result.notes).toBe("Part one Part two");
    });

    it("handles empty communication parts", () => {
      const movement = createMovement({
        communicationPart1: "",
        communicationPart2: "",
      });

      const result = mapper.mapMovementToTransaction(movement, accountId);

      expect(result.notes).toBe("");
    });

    it("uses Unknown for missing counterparty name", () => {
      const movement = createMovement({ counterpartyName: "" });

      const result = mapper.mapMovementToTransaction(movement, accountId);

      expect(result.payee_name).toBe("Unknown");
    });

    it("generates correct imported_id from identifier", () => {
      const movement = createMovement({
        identifier: "TXN-12345",
      });

      const result = mapper.mapMovementToTransaction(movement, accountId);

      expect(result.imported_id).toBe("TXN-12345");
    });

    it("rounds amounts correctly for cents", () => {
      const movement = createMovement({ movementAmount: 99.99, movementSign: "-" });

      const result = mapper.mapMovementToTransaction(movement, accountId);

      expect(result.amount).toBe(-9999);
    });
  });

  describe("mapMovementsToTransactions", () => {
    it("maps multiple movements", () => {
      const movements = [
        createMovement({ identifier: "TXN-1" }),
        createMovement({ identifier: "TXN-2" }),
        createMovement({ identifier: "TXN-3" }),
      ];

      const result = mapper.mapMovementsToTransactions(movements, accountId);

      expect(result).toHaveLength(3);
      expect(result[0]!.imported_id).toBe("TXN-1");
      expect(result[1]!.imported_id).toBe("TXN-2");
      expect(result[2]!.imported_id).toBe("TXN-3");
    });

    it("returns empty array for empty input", () => {
      const result = mapper.mapMovementsToTransactions([], accountId);

      expect(result).toEqual([]);
    });
  });
});

