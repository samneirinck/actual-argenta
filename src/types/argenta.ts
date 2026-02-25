export interface ArgentaAccount {
  id: string;
  iban: string;
  alias: string;
}

export interface ArgentaMovement {
  accountNumber: string;
  accountingDate: string;
  communicationPart1: string;
  communicationPart2: string;
  counterPartyAccountNumber: string;
  counterpartyName: string;
  identifier: string;
  isRejectable: boolean;
  movementAmount: number;
  movementSign: string;
  operationCounterparty: string;
  operationDate: string;
  operationReference: string;
  orderAmount: number;
  pispParticipantName: string;
  rejectionIdentifier: string;
  standardWording: string;
  structuredCommunicationSwitch: string;
  valueDate: string;
}

export interface ArgentaMovementsResponse {
  result: ArgentaMovement[];
  rowCount: number;
}

export interface ArgentaAccountsResponse {
  accounts: ArgentaAccount[];
}
