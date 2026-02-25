import type { ArgentaMovement } from "../types/argenta.js";
import { ImportTransactionEntity } from "@actual-app/api/@types/loot-core/src/types/models/import-transaction.js";

export class TransactionMapper {
  mapMovementToTransaction(
    movement: ArgentaMovement,
    accountId: string,
  ): ImportTransactionEntity {
    const amount =
      movement.movementSign === "-"
        ? -Math.round(movement.movementAmount * 100)
        : Math.round(movement.movementAmount * 100);

    const payeeName = movement.counterpartyName || "Unknown";

    const notes = [movement.communicationPart1, movement.communicationPart2]
      .filter(Boolean)
      .join(" ")
      .trim();

    return {
      account: accountId,
      date: this.formatDate(movement.accountingDate),
      amount,
      payee_name: payeeName,
      notes,
      imported_id: movement.identifier,
    };
  }

  mapMovementsToTransactions(
    movements: ArgentaMovement[],
    accountId: string,
  ): ImportTransactionEntity[] {
    return movements.map((m) => this.mapMovementToTransaction(m, accountId));
  }

  private formatDate(dateStr: string): string {
    if (dateStr.length === 8) {
      return `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
    }
    return dateStr;
  }
}
