export interface Transaction {
  id: string;
  pageNumber: number;
  dateTime: string;
  transactionDate: string;
  valueDate?: string;
  channel?: string;
  code?: string;
  description: string;
  referenceNo?: string;
  withdrawal: number;
  deposit: number;
  balance: number;
  category?: string;
  isReconciled?: boolean;
  expectedBalance?: number;
  balanceDiff?: number;
}

export interface StatementPeriod {
  startDate: string;
  endDate: string;
}

export interface StatementData {
  bankName: string;
  accountNumber: string;
  accountName: string;
  accountType: string;
  currency: string;
  statementPeriod: StatementPeriod;
  pageCount: number;
  beginningBalance: number;
  endingBalance: number;
  totalDeposits: number;
  totalWithdrawals: number;
  transactions: Transaction[];
  reconciliationNotes?: string;
  confidenceScore?: number;
  fileName?: string;
  fileSize?: number;
  processedAt?: string;
}

export interface ReconciliationSummary {
  isFullyReconciled: boolean;
  totalDiscrepancies: number;
  headerMathMatches: boolean;
  calculatedEndingBalance: number;
  headerDifference: number;
  sumRowDeposits: number;
  sumRowWithdrawals: number;
  calculatedNetChange: number;
  totalRows: number;
  rowDiscrepancies: {
    rowIndex: number;
    transactionId: string;
    expectedBalance: number;
    actualBalance: number;
    difference: number;
    description: string;
  }[];
}
