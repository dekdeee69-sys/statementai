import * as XLSX from 'xlsx';
import { StatementData, Transaction } from '../types/statement';
import { formatCurrency } from './reconciliation';

export function exportToExcel(statement: StatementData, fileName?: string) {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Statement Info
  const infoData = [
    ['รายการเดินบัญชี (Bank Statement) OCR & Audit Report', ''],
    ['ธนาคาร (Bank)', statement.bankName || '-'],
    ['เลขที่บัญชี (Account No.)', statement.accountNumber || '-'],
    ['ชื่อบัญชี (Account Name)', statement.accountName || '-'],
    ['ประเภทบัญชี (Account Type)', statement.accountType || '-'],
    ['สกุลเงิน (Currency)', statement.currency || 'THB'],
    ['ช่วงเวลา (Period)', `${statement.statementPeriod?.startDate || '-'} ถึง ${statement.statementPeriod?.endDate || '-'}`],
    ['จำนวนหน้า PDF (Pages)', statement.pageCount || 1],
    ['ยอดยกมาเริ่มต้น (Beginning Balance)', statement.beginningBalance || 0],
    ['ยอดคงเหลือสิ้นสุด (Ending Balance)', statement.endingBalance || 0],
    ['ยอดฝากรวม (Total Deposits)', statement.totalDeposits || 0],
    ['ยอดถอนรวม (Total Withdrawals)', statement.totalWithdrawals || 0],
    ['จำนวนรายการ (Total Transactions)', statement.transactions?.length || 0],
    ['วันที่ประมวลผล (Extracted At)', new Date().toLocaleString('th-TH')],
  ];
  const wsInfo = XLSX.utils.aoa_to_sheet(infoData);
  XLSX.utils.book_append_sheet(wb, wsInfo, 'สรุปภาพรวม (Summary)');

  // Sheet 2: Transactions
  const txHeaders = [
    'ลำดับ (No.)',
    'หน้า PDF (Page)',
    'วันที่ (Date)',
    'เวลา (Time)',
    'ช่องทาง (Channel)',
    'รหัสรายการ (Code)',
    'คำอธิบายรายการ (Description)',
    'เลขอ้างอิง (Reference No.)',
    'ถอน/จ่าย (Withdrawal)',
    'ฝาก/รับ (Deposit)',
    'ยอดคงเหลือ (Balance)',
    'หมวดหมู่ (Category)',
    'สถานะตรวจสอบ (Audit Status)',
  ];

  const txRows = (statement.transactions || []).map((t: Transaction, idx: number) => [
    idx + 1,
    t.pageNumber || 1,
    t.transactionDate || '',
    t.dateTime?.includes(' ') ? t.dateTime.split(' ')[1] : '',
    t.channel || '',
    t.code || '',
    t.description || '',
    t.referenceNo || '',
    t.withdrawal || 0,
    t.deposit || 0,
    t.balance || 0,
    t.category || 'ทั่วไป',
    t.isReconciled === false ? 'พบผลต่าง (Discrepancy)' : 'ถูกต้อง (Reconciled)',
  ]);

  const wsTx = XLSX.utils.aoa_to_sheet([txHeaders, ...txRows]);

  // Set column widths
  wsTx['!cols'] = [
    { wch: 10 },
    { wch: 10 },
    { wch: 14 },
    { wch: 10 },
    { wch: 14 },
    { wch: 12 },
    { wch: 36 },
    { wch: 20 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 },
    { wch: 20 },
  ];

  XLSX.utils.book_append_sheet(wb, wsTx, 'รายการเดินบัญชี (Transactions)');

  const outputName = fileName 
    ? `${fileName.replace(/\.[^/.]+$/, '')}_extracted.xlsx`
    : `statement_${statement.bankName || 'bank'}_${Date.now()}.xlsx`;

  XLSX.writeFile(wb, outputName);
}

export function exportToCSV(statement: StatementData, fileName?: string) {
  const headers = [
    'No',
    'Page',
    'Date',
    'DateTime',
    'Channel',
    'Code',
    'Description',
    'ReferenceNo',
    'Withdrawal',
    'Deposit',
    'Balance',
    'Category',
    'Reconciled'
  ];

  const rows = (statement.transactions || []).map((t, idx) => [
    idx + 1,
    t.pageNumber || 1,
    `"${(t.transactionDate || '').replace(/"/g, '""')}"`,
    `"${(t.dateTime || '').replace(/"/g, '""')}"`,
    `"${(t.channel || '').replace(/"/g, '""')}"`,
    `"${(t.code || '').replace(/"/g, '""')}"`,
    `"${(t.description || '').replace(/"/g, '""')}"`,
    `"${(t.referenceNo || '').replace(/"/g, '""')}"`,
    t.withdrawal || 0,
    t.deposit || 0,
    t.balance || 0,
    `"${(t.category || '').replace(/"/g, '""')}"`,
    t.isReconciled === false ? 'Discrepancy' : 'Matched'
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName 
    ? `${fileName.replace(/\.[^/.]+$/, '')}_transactions.csv`
    : `statement_transactions_${Date.now()}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function exportToJSON(statement: StatementData, fileName?: string) {
  const jsonContent = JSON.stringify(statement, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName 
    ? `${fileName.replace(/\.[^/.]+$/, '')}_data.json`
    : `statement_data_${Date.now()}.json`;
  link.click();
  URL.revokeObjectURL(url);
}
