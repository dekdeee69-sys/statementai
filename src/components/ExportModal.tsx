import React, { useState } from 'react';
import { 
  Download, 
  FileSpreadsheet, 
  FileText, 
  Code, 
  Copy, 
  Check, 
  X,
  FileCheck
} from 'lucide-react';
import { StatementData } from '../types/statement';
import { exportToExcel, exportToCSV, exportToJSON } from '../utils/export';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  statement: StatementData;
}

export const ExportModal: React.FC<Props> = ({ isOpen, onClose, statement }) => {
  const [copiedType, setCopiedType] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopyTSV = () => {
    const headers = ['ลำดับ', 'หน้า', 'วันที่', 'ช่องทาง', 'รหัส', 'รายละเอียด', 'ถอน/จ่าย', 'ฝาก/รับ', 'ยอดคงเหลือ', 'หมวดหมู่'];
    const rows = (statement.transactions || []).map((t, idx) => [
      idx + 1,
      t.pageNumber || 1,
      t.transactionDate || '',
      t.channel || '',
      t.code || '',
      t.description || '',
      t.withdrawal || 0,
      t.deposit || 0,
      t.balance || 0,
      t.category || '',
    ]);
    const tsv = [headers.join('\t'), ...rows.map(r => r.join('\t'))].join('\n');
    navigator.clipboard.writeText(tsv);
    setCopiedType('tsv');
    setTimeout(() => setCopiedType(null), 2000);
  };

  const handleCopyJSON = () => {
    navigator.clipboard.writeText(JSON.stringify(statement, null, 2));
    setCopiedType('json');
    setTimeout(() => setCopiedType(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
            <Download className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">ส่งออกข้อมูลสเตทเม้นท์ (Export Statement Data)</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              เลือกรูปแบบไฟล์ที่ต้องการเพื่อนำเข้าโปรแกรมบัญชี หรือใช้งานต่อ
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          {/* Excel .xlsx */}
          <button
            onClick={() => {
              exportToExcel(statement, statement.fileName);
              onClose();
            }}
            className="p-4 rounded-xl bg-slate-950/80 border border-emerald-500/30 hover:border-emerald-500/60 hover:bg-emerald-950/20 text-left transition group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg group-hover:scale-105 transition">
                <FileSpreadsheet className="w-5 h-5" />
              </span>
              <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                ยอดนิยม (Excel)
              </span>
            </div>
            <div className="font-semibold text-sm text-slate-100 group-hover:text-emerald-300 transition">
              Microsoft Excel (.xlsx)
            </div>
            <div className="text-xs text-slate-400 mt-1">
              พร้อมแยกชีตสรุปภาพรวม + รายการละเอียด จัดขนาดคอลัมน์อัตโนมัติ
            </div>
          </button>

          {/* CSV */}
          <button
            onClick={() => {
              exportToCSV(statement, statement.fileName);
              onClose();
            }}
            className="p-4 rounded-xl bg-slate-950/80 border border-blue-500/30 hover:border-blue-500/60 hover:bg-blue-950/20 text-left transition group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="p-2 bg-blue-500/10 text-blue-400 rounded-lg group-hover:scale-105 transition">
                <FileText className="w-5 h-5" />
              </span>
              <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-blue-500/20 text-blue-300">
                UTF-8 BOM
              </span>
            </div>
            <div className="font-semibold text-sm text-slate-100 group-hover:text-blue-300 transition">
              CSV Format (.csv)
            </div>
            <div className="text-xs text-slate-400 mt-1">
              รองรับภาษาไทย 100% เปิดใน Excel แล้วภาษาไทยไม่เป็นภาษาต่างดาว
            </div>
          </button>

          {/* JSON */}
          <button
            onClick={() => {
              exportToJSON(statement, statement.fileName);
              onClose();
            }}
            className="p-4 rounded-xl bg-slate-950/80 border border-purple-500/30 hover:border-purple-500/60 hover:bg-purple-950/20 text-left transition group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="p-2 bg-purple-500/10 text-purple-400 rounded-lg group-hover:scale-105 transition">
                <Code className="w-5 h-5" />
              </span>
              <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-purple-500/20 text-purple-300">
                API / ERP
              </span>
            </div>
            <div className="font-semibold text-sm text-slate-100 group-hover:text-purple-300 transition">
              Structured JSON (.json)
            </div>
            <div className="text-xs text-slate-400 mt-1">
              โครงสร้างครบถ้วนสำหรับระบบบัญชี ERP, Database หรือนักพัฒนา
            </div>
          </button>

          {/* Copy to Clipboard */}
          <button
            onClick={handleCopyTSV}
            className="p-4 rounded-xl bg-slate-950/80 border border-slate-700 hover:border-slate-500 hover:bg-slate-800 text-left transition group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="p-2 bg-slate-800 text-slate-300 rounded-lg group-hover:scale-105 transition">
                {copiedType === 'tsv' ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5" />}
              </span>
              <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                คลิปบอร์ด
              </span>
            </div>
            <div className="font-semibold text-sm text-slate-100 group-hover:text-indigo-300 transition">
              {copiedType === 'tsv' ? 'คัดลอกเรียบร้อยแล้ว!' : 'คัดลอกสำหรับ Google Sheets'}
            </div>
            <div className="text-xs text-slate-400 mt-1">
              คัดลอกเป็นตาราง TSV วางลง Google Sheets หรือ Excel ได้ทันที
            </div>
          </button>
        </div>

        <div className="p-3 bg-slate-950/50 rounded-xl border border-slate-800 text-xs text-slate-400 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-emerald-400" />
            <span>ยอดรวมรายการ: {statement.transactions.length} รายการ ({statement.pageCount || 1} หน้า PDF)</span>
          </div>
          <button
            onClick={handleCopyJSON}
            className="text-xs text-indigo-400 hover:text-indigo-300 underline"
          >
            {copiedType === 'json' ? 'คัดลอก JSON แล้ว' : 'คัดลอก JSON'}
          </button>
        </div>
      </div>
    </div>
  );
};
