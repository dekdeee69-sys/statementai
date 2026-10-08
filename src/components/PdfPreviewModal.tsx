import React from 'react';
import { X, FileText, Download, ExternalLink } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  pdfUrl?: string | null;
  fileName?: string;
  pageCount?: number;
}

export const PdfPreviewModal: React.FC<Props> = ({
  isOpen,
  onClose,
  pdfUrl,
  fileName,
  pageCount,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl h-[88vh] flex flex-col shadow-2xl overflow-hidden relative">
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white truncate max-w-md">
                {fileName || 'ไฟล์เอกสารสเตทเม้นท์ต้นฉบับ'}
              </h3>
              <p className="text-xs text-slate-400">
                เอกสาร PDF ต้นฉบับ {pageCount ? `(${pageCount} หน้า)` : ''} สำหรับตรวจสอบเปรียบเทียบ
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {pdfUrl && (
              <a
                href={pdfUrl}
                download={fileName || 'bank_statement.pdf'}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium flex items-center gap-1.5 transition"
              >
                <Download className="w-3.5 h-3.5" /> ดาวน์โหลด
              </a>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PDF Viewer Body */}
        <div className="flex-1 bg-slate-950 p-2 sm:p-4 overflow-hidden">
          {pdfUrl ? (
            <iframe
              src={`${pdfUrl}#toolbar=1&navpanes=1`}
              title="PDF Preview"
              className="w-full h-full rounded-xl border border-slate-800 bg-white"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 gap-3">
              <FileText className="w-12 h-12 text-slate-600" />
              <p className="text-sm">ไม่มีไฟล์ PDF สำหรับแสดงตัวอย่าง</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
