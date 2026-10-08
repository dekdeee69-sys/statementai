import { StatementData, Transaction, ReconciliationSummary } from '../types/statement';

const ROUND_PRECISION = 2;

function roundMoney(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

export function runReconciliation(data: StatementData): {
  summary: ReconciliationSummary;
  reconciledTransactions: Transaction[];
} {
  const transactions = data.transactions || [];
  let currentBalance = roundMoney(data.beginningBalance || 0);

  let sumDeposits = 0;
  let sumWithdrawals = 0;
  const rowDiscrepancies: ReconciliationSummary['rowDiscrepancies'] = [];

  const reconciledTransactions: Transaction[] = transactions.map((tx, index) => {
    const deposit = roundMoney(tx.deposit || 0);
    const withdrawal = roundMoney(tx.withdrawal || 0);
    const actualBalance = roundMoney(tx.balance || 0);

    sumDeposits = roundMoney(sumDeposits + deposit);
    sumWithdrawals = roundMoney(sumWithdrawals + withdrawal);

    const expectedBalance = roundMoney(currentBalance + deposit - withdrawal);
    const diff = roundMoney(Math.abs(expectedBalance - actualBalance));
    const isRowMatch = diff <= 0.05;

    if (!isRowMatch) {
      rowDiscrepancies.push({
        rowIndex: index,
        transactionId: tx.id || `tx-${index}`,
        expectedBalance,
        actualBalance,
        difference: roundMoney(actualBalance - expectedBalance),
        description: tx.description,
      });
    }

    // In a bank statement, next row's calculation theoretically starts from current row's stated balance,
    // or from expectedBalance if adjusted.
    currentBalance = actualBalance;

    return {
      ...tx,
      deposit,
      withdrawal,
      balance: actualBalance,
      isReconciled: isRowMatch,
      expectedBalance,
      balanceDiff: diff > 0.05 ? roundMoney(actualBalance - expectedBalance) : 0,
    };
  });

  const calculatedEndingBalance = roundMoney(
    (data.beginningBalance || 0) + sumDeposits - sumWithdrawals
  );
  const headerDiff = roundMoney(
    Math.abs((data.endingBalance || 0) - calculatedEndingBalance)
  );
  const headerMathMatches = headerDiff <= 0.05;

  const summary: ReconciliationSummary = {
    isFullyReconciled: headerMathMatches && rowDiscrepancies.length === 0,
    totalDiscrepancies: rowDiscrepancies.length + (headerMathMatches ? 0 : 1),
    headerMathMatches,
    calculatedEndingBalance,
    headerDifference: roundMoney((data.endingBalance || 0) - calculatedEndingBalance),
    sumRowDeposits: sumDeposits,
    sumRowWithdrawals: sumWithdrawals,
    calculatedNetChange: roundMoney(sumDeposits - sumWithdrawals),
    totalRows: transactions.length,
    rowDiscrepancies,
  };

  return { summary, reconciledTransactions };
}

export function recalculateRunningBalances(data: StatementData): StatementData {
  let running = roundMoney(data.beginningBalance || 0);
  const newTransactions = data.transactions.map((tx) => {
    const deposit = roundMoney(tx.deposit || 0);
    const withdrawal = roundMoney(tx.withdrawal || 0);
    running = roundMoney(running + deposit - withdrawal);
    return {
      ...tx,
      deposit,
      withdrawal,
      balance: running,
      isReconciled: true,
      expectedBalance: running,
      balanceDiff: 0,
    };
  });

  return {
    ...data,
    endingBalance: running,
    transactions: newTransactions,
  };
}

export function formatCurrency(amount: number | undefined | null, currency: string = 'THB'): string {
  const val = amount ?? 0;
  return new Intl.NumberFormat('th-TH', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val) + (currency ? ` ${currency}` : '');
}
