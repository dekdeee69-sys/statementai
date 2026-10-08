import React from 'react';
import { 
  Building2, 
  CreditCard, 
  Calendar, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Wallet, 
  CheckCircle2, 
  AlertTriangle,
  FileText,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';
import { StatementData, ReconciliationSummary } from '../types/statement';
import { formatCurrency } from '../utils/reconciliation';

interface Props {
  statement: StatementData;
  reconciliation: ReconciliationSummary;
  onAutoRecalculate?: () => void;
}

export const StatementSummary: React.FC<Props> = ({ 
  statement, 
  reconciliation, 
  onAutoRecalculate 
}) => {
  const getBankBadgeStyle = (bankName: string) => {
    const lower = bankName.toLowerCase();
    if (lower.includes('kbank') || lower.includes('กสิกร')) {
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    }
    if (lower.includes('scb') || lower.includes('ไทยพาณิชย์')) {
      return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
    }
    if (lower.includes('bbl') || lower.includes('กรุงเทพ')) {
      return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
    }
    if (lower.includes('ktb') || lower.includes('กรุงไทย')) {
      return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
    }
    if (lower.includes('bay') || lower.includes('กรุงศรี')) {
      return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
    }
    return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30';
  };

  return (
    <div className="space-y-4">
      {/* Top Header Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl backdrop-blur-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold text-white tracking-tight">
                  {statement.bankName || 'ธนาคารไม่ระบุ'}
                </h2>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${getBankBadgeStyle(statement.bankName || '')}`}>
                  {statement.accountType || 'บัญชีเงินฝาก'}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1">
                  <FileText className="w-3 h-3 text-slate-400" />
                  {statement.pageCount || 1} หน้า (Pages)
                </span>
              </div>
              <p className="text-sm text-slate-400 mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
                <span className="flex items-center gap-1.5 font-mono text-slate-300">
                  <CreditCard className="w-4 h-4 text-slate-500" />
                  {statement.accountNumber || '-'}
                </span>
                <span className="text-slate-500">•</span>
                <span className="text-slate-200 font-medium">
                  {statement.accountName || 'ชื่อบัญชีไม่ระบุ'}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-start lg:self-center">
            <div className="text-left sm:text-right bg-slate-800/40 border border-slate-700/50 px-3.5 py-2 rounded-xl">
              <div className="text-xs text-slate-400 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                รอบบัญชี (Period)
              </div>
              <div className="text-sm font-semibold text-slate-200 mt-0.5">
                {statement.statementPeriod?.startDate || '-'} — {statement.statementPeriod?.endDate || '-'}
              </div>
            </div>

            {/* Audit Status Pill */}
            <div className={`px-3.5 py-2 rounded-xl border flex items-center gap-2 ${
              reconciliation.isFullyReconciled 
                ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300' 
                : 'bg-amber-950/40 border-amber-500/30 text-amber-300'
            }`}>
              {reconciliation.isFullyReconciled ? (
                <>
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <div className="text-left">
                    <div className="text-xs font-medium leading-none text-emerald-400">ตรวจสอบยอดแล้ว</div>
                    <div className="text-[11px] text-emerald-300/80 mt-0.5">ถูกต้อง 100% (Reconciled)</div>
                  </div>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                  <div className="text-left">
                    <div className="text-xs font-medium leading-none text-amber-400">พบจุดตรวจสอบ</div>
                    <div className="text-[11px] text-amber-300/80 mt-0.5">{reconciliation.totalDiscrepancies} จุดที่ต้องดู</div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* 4 Financial Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
          {/* Beginning Balance */}
          <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800/80 hover:border-slate-700 transition">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>ยอดยกมาเริ่มต้น (Beginning)</span>
              <Wallet className="w-4 h-4 text-slate-500" />
            </div>
            <div className="text-xl font-bold font-mono text-slate-100 mt-1.5">
              {formatCurrency(statement.beginningBalance, statement.currency)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              ณ วันที่ {statement.statementPeriod?.startDate || 'เริ่มต้น'}
            </div>
          </div>

          {/* Total Deposits */}
          <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-900/30 hover:border-emerald-700/40 transition">
            <div className="flex items-center justify-between text-xs text-emerald-400">
              <span>ยอดเงินฝาก/เข้า (Total Inflow)</span>
              <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-xl font-bold font-mono text-emerald-300 mt-1.5">
              +{formatCurrency(statement.totalDeposits, statement.currency)}
            </div>
            <div className="text-[11px] text-emerald-500/80 mt-1">
              {statement.transactions.filter(t => t.deposit > 0).length} รายการรับ
            </div>
          </div>

          {/* Total Withdrawals */}
          <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-900/30 hover:border-rose-700/40 transition">
            <div className="flex items-center justify-between text-xs text-rose-400">
              <span>ยอดเงินถอน/จ่าย (Total Outflow)</span>
              <ArrowUpRight className="w-4 h-4 text-rose-400" />
            </div>
            <div className="text-xl font-bold font-mono text-rose-300 mt-1.5">
              -{formatCurrency(statement.totalWithdrawals, statement.currency)}
            </div>
            <div className="text-[11px] text-rose-500/80 mt-1">
              {statement.transactions.filter(t => t.withdrawal > 0).length} รายการจ่าย
            </div>
          </div>

          {/* Ending Balance */}
          <div className="p-4 rounded-xl bg-indigo-950/25 border border-indigo-900/30 hover:border-indigo-700/40 transition">
            <div className="flex items-center justify-between text-xs text-indigo-300">
              <span>ยอดคงเหลือสิ้นสุด (Ending)</span>
              <Building2 className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-xl font-bold font-mono text-indigo-200 mt-1.5">
              {formatCurrency(statement.endingBalance, statement.currency)}
            </div>
            <div className="text-[11px] text-indigo-400/80 mt-1">
              ณ วันที่ {statement.statementPeriod?.endDate || 'สิ้นสุด'}
            </div>
          </div>
        </div>
      </div>

      {/* Discrepancy Alert & 1-click Auto-Rebalance if discrepancies found */}
      {!reconciliation.isFullyReconciled && (
        <div className="bg-amber-950/30 border border-amber-500/40 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-200 text-sm">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-amber-300">ระบบตรวจพบผลต่างการคำนวณ (Mathematical Discrepancy):</span>
              <p className="text-xs text-amber-200/90 mt-0.5">
                ยอดยกมา ({formatCurrency(statement.beginningBalance)}) + ฝาก ({formatCurrency(reconciliation.sumRowDeposits)}) - ถอน ({formatCurrency(reconciliation.sumRowWithdrawals)}) = ยอดคำนวณได้{' '}
                <span className="font-mono font-bold">{formatCurrency(reconciliation.calculatedEndingBalance)}</span>{' '}
                (ผลต่างจากยอดที่ระบุ: {formatCurrency(Math.abs(reconciliation.headerDifference))})
              </p>
            </div>
          </div>

          {onAutoRecalculate && (
            <button
              onClick={onAutoRecalculate}
              className="px-3.5 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 rounded-lg text-xs font-semibold flex items-center gap-1.5 shrink-0 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              ปรับสมดุลยอดอัตโนมัติ (Recalculate)
            </button>
          )}
        </div>
      )}
    </div>
  );
};
