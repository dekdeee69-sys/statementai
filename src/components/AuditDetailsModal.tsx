import React from 'react';
import { 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  X, 
  Calculator, 
  ArrowRight, 
  FileCheck2,
  RefreshCw
} from 'lucide-react';
import { StatementData, ReconciliationSummary } from '../types/statement';
import { formatCurrency } from '../utils/reconciliation';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  statement: StatementData;
  reconciliation: ReconciliationSummary;
  onAutoRecalculate?: () => void;
}

export const AuditDetailsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  statement,
  reconciliation,
  onAutoRecalculate,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className={`p-3 rounded-xl border ${
            reconciliation.isFullyReconciled 
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
              : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
          }`}>
            <Calculator className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">รายงานตรวจสอบกระทบยอด (Reconciliation & Audit Report)</h3>
            <p className="text-xs text-slate-400">
              การพิสูจน์ความถูกต้องทางคณิตศาสตร์แบบบรรทัดต่อบรรทัด (Line-by-Line Math Verification)
            </p>
          </div>
        </div>

        {/* Audit Status Card */}
        <div className={`p-4 rounded-xl border mb-5 ${
          reconciliation.isFullyReconciled
            ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
            : 'bg-amber-950/30 border-amber-500/40 text-amber-200'
        }`}>
          <div className="flex items-center gap-2 font-bold text-sm">
            {reconciliation.isFullyReconciled ? (
              <>
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <span>สถานะ: กระทบยอดถูกต้องสมบูรณ์ 100% (Fully Reconciled & Audited)</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                <span>สถานะ: พบจุดที่ยอดไม่ตรงกัน ({reconciliation.totalDiscrepancies} จุด)</span>
              </>
            )}
          </div>
          <p className="text-xs mt-1.5 opacity-90 leading-relaxed">
            {reconciliation.isFullyReconciled
              ? 'รายการเดินบัญชีทุกรายการมียอดคงเหลือต่อเนื่องสัมพันธ์กันอย่างสมบูรณ์แบบ ยอดยกมาบวกยอดเงินฝากหักยอดเงินถอนเท่ากับยอดยกไปสิ้นสุดตรงตามเอกสารสเตทเม้นท์'
              : 'พบรายการที่มีผลต่างการคำนวณ อาจเกิดจากเอกสารต้นฉบับมีรายการย่อยที่ข้ามหน้า หรือมีค่าธรรมเนียมแฝง คุณสามารถใช้ปุ่มปรับสมดุลยอดคงเหลืออัตโนมัติได้'}
          </p>
        </div>

        {/* Global Equation Breakdown */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 mb-5">
          <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">
            สูตรการกระทบยอดภาพรวม (Macro Reconciliation Formula)
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs font-mono">
            <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800">
              <div className="text-[10px] text-slate-400 font-sans">ยอดยกมา (Beginning)</div>
              <div className="text-sm font-bold text-slate-200 mt-1">{formatCurrency(statement.beginningBalance, '')}</div>
            </div>
            <div className="p-2.5 bg-slate-900 rounded-lg border border-emerald-900/40">
              <div className="text-[10px] text-emerald-400 font-sans">+ เงินฝากรวม (Inflow)</div>
              <div className="text-sm font-bold text-emerald-300 mt-1">+{formatCurrency(reconciliation.sumRowDeposits, '')}</div>
            </div>
            <div className="p-2.5 bg-slate-900 rounded-lg border border-rose-900/40">
              <div className="text-[10px] text-rose-400 font-sans">- เงินถอนรวม (Outflow)</div>
              <div className="text-sm font-bold text-rose-300 mt-1">-{formatCurrency(reconciliation.sumRowWithdrawals, '')}</div>
            </div>
            <div className="p-2.5 bg-slate-900 rounded-lg border border-indigo-900/40">
              <div className="text-[10px] text-indigo-300 font-sans">= ยอดสิ้นสุดคำนวณได้</div>
              <div className="text-sm font-bold text-indigo-200 mt-1">{formatCurrency(reconciliation.calculatedEndingBalance, '')}</div>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs">
            <span className="text-slate-400">ยอดคงเหลือสิ้นสุดที่พิมพ์บนเอกสาร:</span>
            <span className="font-mono font-bold text-slate-200">{formatCurrency(statement.endingBalance, statement.currency)}</span>
          </div>
          <div className="flex items-center justify-between text-xs mt-1">
            <span className="text-slate-400">ผลต่างสุทธิ (Net Difference):</span>
            <span className={`font-mono font-bold ${reconciliation.headerDifference === 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
              {formatCurrency(reconciliation.headerDifference, statement.currency)}
            </span>
          </div>
        </div>

        {/* Row-level Discrepancies (if any) */}
        {reconciliation.rowDiscrepancies.length > 0 && (
          <div className="mb-5">
            <div className="text-xs font-semibold text-amber-300 mb-2 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" /> รายการที่ตรวจพบผลต่างต่อเนื่อง ({reconciliation.rowDiscrepancies.length} แถว):
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {reconciliation.rowDiscrepancies.map((disc, idx) => (
                <div key={idx} className="p-3 bg-amber-950/20 border border-amber-500/30 rounded-lg text-xs">
                  <div className="flex items-center justify-between font-semibold text-slate-200">
                    <span>แถวที่ {disc.rowIndex + 1}: {disc.description}</span>
                    <span className="text-amber-400 font-mono">ผลต่าง: {disc.difference > 0 ? `+${disc.difference}` : disc.difference}</span>
                  </div>
                  <div className="text-slate-400 text-[11px] mt-1 flex gap-4 font-mono">
                    <span>ยอดที่ควรเป็น: {disc.expectedBalance}</span>
                    <span>ยอดจริงบนสเตทเม้นท์: {disc.actualBalance}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Auto Recalculate Button */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
          {onAutoRecalculate && !reconciliation.isFullyReconciled && (
            <button
              onClick={() => {
                onAutoRecalculate();
                onClose();
              }}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              ปรับสมดุลยอดอัตโนมัติ (Auto-Cascade Recalculate)
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
          >
            ปิดหน้าต่าง (Close)
          </button>
        </div>
      </div>
    </div>
  );
};
