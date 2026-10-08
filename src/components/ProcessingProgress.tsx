import React, { useEffect, useState } from 'react';
import { 
  FileText, 
  Layers, 
  CheckCircle2, 
  Clock, 
  Loader2, 
  Sparkles, 
  ShieldCheck, 
  Calculator, 
  Hash
} from 'lucide-react';

interface Props {
  totalPages: number;
  currentPage: number;
  extractedCount: number;
  pageStatusMap: Record<number, 'pending' | 'processing' | 'completed' | 'error'>;
  fileName?: string;
  fileSizeMb?: number;
  bankHint?: string;
  onCancel?: () => void;
}

export const ProcessingProgress: React.FC<Props> = ({
  totalPages = 1,
  currentPage = 1,
  extractedCount = 0,
  pageStatusMap = {},
  fileName,
  fileSizeMb,
  bankHint,
  onCancel,
}) => {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Timer counter
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Compute completed pages
  const completedCount = Object.values(pageStatusMap).filter(s => s === 'completed').length;
  const progressPercent = Math.min(
    100,
    Math.round((completedCount / Math.max(totalPages, 1)) * 95) + (currentPage > completedCount ? 5 : 0)
  );

  return (
    <div className="bg-slate-900 border border-indigo-500/40 rounded-2xl p-5 sm:p-6 shadow-2xl relative overflow-hidden backdrop-blur-md animate-fadeIn">
      {/* Background ambient glow */}
      <div className="absolute -top-24 -right-24 w-60 h-60 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-60 h-60 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/30 relative">
            <Layers className="w-5 h-5 animate-pulse" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white">
                กำลังสแกนหน้า {Math.min(currentPage, totalPages)} จากทั้งหมด {totalPages} หน้า
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                {progressPercent}%
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              ไฟล์: <span className="text-slate-200 font-medium">{fileName || 'statement.pdf'}</span>
              {fileSizeMb && <span className="ml-1.5 font-mono">({fileSizeMb.toFixed(1)} MB)</span>}
              {bankHint && bankHint !== 'auto' && (
                <span className="ml-2 text-indigo-300">({bankHint})</span>
              )}
            </p>
          </div>
        </div>

        {/* Counter & Timer & Cancel */}
        <div className="flex items-center gap-2.5 self-start sm:self-center">
          {/* Live Extracted Count Pill */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-xs text-emerald-300 font-mono font-bold shadow-sm">
            <Hash className="w-3.5 h-3.5 text-emerald-400" />
            <span>สกัดแล้ว {extractedCount} รายการ</span>
          </div>

          {/* Timer */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300 font-mono">
            <Clock className="w-3.5 h-3.5 text-indigo-400" />
            <span>{elapsedSeconds}s</span>
          </div>

          {onCancel && (
            <button
              onClick={onCancel}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl text-xs transition"
            >
              ยกเลิก
            </button>
          )}
        </div>
      </div>

      {/* Main Animated Progress Bar */}
      <div className="mt-5 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-200 font-medium flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>
              {completedCount === totalPages
                ? `สแกนครบทั้ง ${totalPages} หน้าเรียบร้อยแล้ว! กำลังตรวจสอบกระทบยอด...`
                : `กำลังดึงข้อมูลรายการอย่างละเอียดทุกแถวในหน้า ${currentPage}...`}
            </span>
          </span>
          <span className="font-mono text-xs font-bold text-indigo-300">
            {completedCount}/{totalPages} หน้าเสร็จสิ้น ({extractedCount} รายการ)
          </span>
        </div>

        <div className="w-full bg-slate-950 h-3.5 rounded-full overflow-hidden p-0.5 border border-slate-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 transition-all duration-300 ease-out shadow-lg shadow-indigo-500/30"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Page-by-Page Progress Cards */}
      <div className="mt-6">
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-indigo-400" />
            <span>ความคืบหน้าแยกตามหน้าเอกสาร (Page-by-Page Real-time Tracker):</span>
          </div>
          <span className="text-emerald-400 text-[11px] font-mono">
            สกัดครบถ้วน 100% ไม่ตัดทอน
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
          {Array.from({ length: totalPages }, (_, index) => {
            const pageNum = index + 1;
            const status = pageStatusMap[pageNum] || (pageNum < currentPage ? 'completed' : pageNum === currentPage ? 'processing' : 'pending');

            const isCompleted = status === 'completed';
            const isProcessing = status === 'processing';

            return (
              <div
                key={pageNum}
                className={`p-3 rounded-xl border transition-all ${
                  isCompleted
                    ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200 shadow-sm'
                    : isProcessing
                    ? 'bg-indigo-950/60 border-indigo-500/60 text-white ring-2 ring-indigo-500/40 shadow-lg shadow-indigo-500/20 animate-pulse'
                    : 'bg-slate-950/40 border-slate-800 text-slate-500 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold font-mono">หน้า {pageNum}</span>
                  {isCompleted ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : isProcessing ? (
                    <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-slate-800" />
                  )}
                </div>

                <div className="text-[11px] leading-tight font-medium">
                  {isCompleted ? (
                    <span className="text-emerald-400 font-semibold">เสร็จสิ้น ✓</span>
                  ) : isProcessing ? (
                    <span className="text-indigo-300 font-semibold">กำลังสแกน...</span>
                  ) : (
                    <span className="text-slate-500">รอคิว</span>
                  )}
                </div>

                <div className="text-[10px] text-slate-400 mt-1 truncate">
                  {pageNum === 1 
                    ? 'ข้อมูลบัญชี & เริ่มต้น' 
                    : pageNum === totalPages 
                    ? 'รายการ & สรุปยอดท้าย' 
                    : 'รายการเดินบัญชี'}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Assurance Footer */}
      <div className="mt-5 p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-400">
        <div className="flex items-center gap-2">
          <Calculator className="w-4 h-4 text-indigo-400 shrink-0" />
          <span>ระบบสกัดแบบแยกทีละหน้าเพื่อความครบถ้วน 100% ป้องกันข้อจำกัด Token และรายการตกหล่น</span>
        </div>
        <div className="flex items-center gap-1.5 text-emerald-400 font-medium font-mono">
          <ShieldCheck className="w-4 h-4" />
          <span>ดึงรายการครบทุกบรรทัด (Exhaustive Extraction)</span>
        </div>
      </div>
    </div>
  );
};
