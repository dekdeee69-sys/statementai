/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef } from 'react';
import { 
  UploadCloud, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  Loader2, 
  Download, 
  Eye, 
  RotateCcw, 
  Sparkles, 
  ShieldCheck, 
  Building, 
  Layers, 
  BarChart3, 
  ListFilter,
  RefreshCw,
  Calculator,
  Lock,
  ArrowRight,
  ArrowLeft,
  FileSpreadsheet
} from 'lucide-react';
import { PDFDocument } from 'pdf-lib';

import { StatementData, Transaction } from './types/statement';
import { runReconciliation, recalculateRunningBalances } from './utils/reconciliation';
import { StatementSummary } from './components/StatementSummary';
import { TransactionTable } from './components/TransactionTable';
import { CashflowChart } from './components/CashflowChart';
import { CategoryBreakdown } from './components/CategoryBreakdown';
import { ExportModal } from './components/ExportModal';
import { PdfPreviewModal } from './components/PdfPreviewModal';
import { AuditDetailsModal } from './components/AuditDetailsModal';
import { ProcessingProgress } from './components/ProcessingProgress';

export default function App() {
  // Statement state - initialized to null (no demo data)
  const [statement, setStatement] = useState<StatementData | null>(null);
  const [uploadedPdfUrl, setUploadedPdfUrl] = useState<string | null>(null);

  // File upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [detectedPageCount, setDetectedPageCount] = useState<number>(1);
  const [bankHint, setBankHint] = useState<string>('auto');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  
  // Real-time Page Tracking State
  const [processingCurrentPage, setProcessingCurrentPage] = useState<number>(1);
  const [extractedRowCount, setExtractedRowCount] = useState<number>(0);
  const [pageStatusMap, setPageStatusMap] = useState<Record<number, 'pending' | 'processing' | 'completed' | 'error'>>({});

  // Error & Abort state
  const [errorState, setErrorState] = useState<{ message: string; isHighDemand?: boolean; details?: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Modals state
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);
  const [isPdfPreviewOpen, setIsPdfPreviewOpen] = useState<boolean>(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState<boolean>(false);

  // Tab view: 'transactions' | 'analytics'
  const [activeTab, setActiveTab] = useState<'transactions' | 'analytics'>('transactions');

  // Mathematical Reconciliation Engine
  const { summary: reconciliationSummary, reconciledTransactions } = useMemo(() => {
    if (!statement) {
      return {
        summary: {
          isFullyReconciled: true,
          totalDiscrepancies: 0,
          headerMathMatches: true,
          calculatedEndingBalance: 0,
          headerDifference: 0,
          sumRowDeposits: 0,
          sumRowWithdrawals: 0,
          calculatedNetChange: 0,
          totalRows: 0,
          rowDiscrepancies: [],
        },
        reconciledTransactions: [],
      };
    }
    return runReconciliation(statement);
  }, [statement]);

  // Convert Uint8Array to Base64 in safe chunks
  const uint8ArrayToBase64 = (bytes: Uint8Array): string => {
    let binary = '';
    const len = bytes.byteLength;
    const chunkSize = 8192;
    for (let i = 0; i < len; i += chunkSize) {
      const chunk = bytes.subarray(i, Math.min(i + chunkSize, len));
      binary += String.fromCharCode.apply(null, chunk as any);
    }
    return btoa(binary);
  };

  // Handle Drag & Drop / File Selection with exact Page Count detection
  const handleFileChange = async (file: File) => {
    if (!file) return;
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setErrorState({ message: 'กรุณาเลือกไฟล์ PDF เท่านั้น (Please upload a valid PDF file)' });
      return;
    }
    // Warn if file is over 25MB
    if (file.size > 25 * 1024 * 1024) {
      setErrorState({
        message: `ไฟล์มีขนาด ${(file.size / 1024 / 1024).toFixed(1)} MB ซึ่งเกิน 25 MB กรุณาเลือกไฟล์ขนาดไม่เกิน 25 MB เพื่อป้องกันเครือข่ายตัดการเชื่อมต่อ`,
      });
      return;
    }
    setErrorState(null);
    setSelectedFile(file);

    // Create preview URL
    const url = URL.createObjectURL(file);
    setUploadedPdfUrl(url);

    // Detect exact number of pages using pdf-lib
    try {
      const buffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
      const pages = pdfDoc.getPageCount();
      setDetectedPageCount(pages || 1);
    } catch (err) {
      console.warn('Could not inspect PDF page count with pdf-lib, defaulting to 1:', err);
      setDetectedPageCount(1);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  // Cancel processing
  const handleCancelProcessing = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsProcessing(false);
    setErrorState({ message: 'ผู้ใช้ยกเลิกการประมวลผลแล้ว' });
  };

  // Process OCR Page-by-Page for 100% Exhaustive Extraction (ไม่มีการตกหล่นของข้อมูล)
  const handleProcessOcr = async () => {
    if (!selectedFile) return;

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsProcessing(true);
    setErrorState(null);
    setExtractedRowCount(0);

    try {
      // 1. Read PDF with pdf-lib
      const buffer = await selectedFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
      const totalPages = pdfDoc.getPageCount();
      setDetectedPageCount(totalPages);

      // Initialize status map for all pages
      const initialMap: Record<number, 'pending' | 'processing' | 'completed' | 'error'> = {};
      for (let p = 1; p <= totalPages; p++) {
        initialMap[p] = 'pending';
      }
      setPageStatusMap(initialMap);

      const allTransactions: Transaction[] = [];
      let detectedBankName = '';
      let detectedAccountNumber = '';
      let detectedAccountName = '';
      let detectedAccountType = '';
      let detectedCurrency = 'THB';
      let detectedBeginningBalance = 0;
      let detectedEndingBalance = 0;
      let detectedStartDate = '';
      let detectedEndDate = '';

      // 2. Loop through each page sequentially
      for (let p = 1; p <= totalPages; p++) {
        if (controller.signal.aborted) break;

        setProcessingCurrentPage(p);
        setPageStatusMap((prev) => ({ ...prev, [p]: 'processing' }));

        // Extract individual page as single-page PDF
        const singleDoc = await PDFDocument.create();
        const [copiedPage] = await singleDoc.copyPages(pdfDoc, [p - 1]);
        singleDoc.addPage(copiedPage);
        const singleBytes = await singleDoc.save();
        const singleBase64 = uint8ArrayToBase64(singleBytes);

        const response = await fetch('/api/ocr-statement-page', {
          method: 'POST',
          signal: controller.signal,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pdfBase64: singleBase64,
            pageNumber: p,
            totalPages,
            bankHint: bankHint === 'auto' ? undefined : bankHint,
            filename: selectedFile.name,
            isFirstPage: p === 1,
            isLastPage: p === totalPages,
          }),
        });

        const rawText = await response.text();
        let result: any;

        try {
          result = JSON.parse(rawText);
        } catch {
          if (response.status === 413) {
            throw { message: 'ไฟล์หน้าเอกสารมีขนาดใหญ่เกินไป (413)', isHighDemand: false };
          }
          if (response.status === 504) {
            throw { message: `หน้า ${p} ใช้เวลาประมวลผลนานเกินกำหนด กรุณากดลองอีกครั้ง`, isHighDemand: true };
          }
          if (response.status === 503) {
            throw { message: `เซิร์ฟเวอร์ AI มีผู้ใช้งานหนาแน่นชั่วคราวขณะสแกนหน้า ${p}`, isHighDemand: true };
          }
          throw { message: `เกิดข้อผิดพลาดในการรับข้อมูลหน้า ${p} (HTTP ${response.status})`, isHighDemand: true };
        }

        if (!response.ok || !result.success) {
          setPageStatusMap((prev) => ({ ...prev, [p]: 'error' }));
          throw {
            message: result.error || `ไม่สามารถประมวลผลหน้า ${p} ได้`,
            isHighDemand: result.isHighDemand || response.status === 503,
          };
        }

        const pageData = result.data;

        // Capture statement headers from Page 1
        if (p === 1) {
          detectedBankName = pageData.bankName || detectedBankName;
          detectedAccountNumber = pageData.accountNumber || detectedAccountNumber;
          detectedAccountName = pageData.accountName || detectedAccountName;
          detectedAccountType = pageData.accountType || detectedAccountType;
          detectedCurrency = pageData.currency || 'THB';
          detectedBeginningBalance = Number(pageData.beginningBalance || 0);
          detectedStartDate = pageData.periodStartDate || '';
        }

        // Capture statement headers from Last Page
        if (p === totalPages) {
          detectedEndingBalance = Number(pageData.endingBalance || 0);
          detectedEndDate = pageData.periodEndDate || '';
        }

        // Append all transactions extracted from this page
        if (Array.isArray(pageData.transactions)) {
          allTransactions.push(...pageData.transactions);
          setExtractedRowCount(allTransactions.length);
        }

        setPageStatusMap((prev) => ({ ...prev, [p]: 'completed' }));
      }

      // If last row has running balance and ending balance wasn't printed, use it
      const sumDeposits = allTransactions.reduce((acc, t) => acc + (t.deposit || 0), 0);
      const sumWithdrawals = allTransactions.reduce((acc, t) => acc + (t.withdrawal || 0), 0);
      
      if (!detectedEndingBalance && allTransactions.length > 0) {
        detectedEndingBalance = allTransactions[allTransactions.length - 1].balance || (detectedBeginningBalance + sumDeposits - sumWithdrawals);
      }

      // 3. Assemble unified statement with all transactions
      const finalStatement: StatementData = {
        bankName: detectedBankName || (bankHint !== 'auto' ? bankHint : 'ธนาคารไทย (Bank Statement)'),
        accountNumber: detectedAccountNumber || '-',
        accountName: detectedAccountName || 'เจ้าของบัญชี',
        accountType: detectedAccountType || 'บัญชีเงินฝาก',
        currency: detectedCurrency || 'THB',
        statementPeriod: {
          startDate: detectedStartDate || (allTransactions[0]?.transactionDate || '-'),
          endDate: detectedEndDate || (allTransactions[allTransactions.length - 1]?.transactionDate || '-'),
        },
        pageCount: totalPages,
        beginningBalance: detectedBeginningBalance,
        endingBalance: detectedEndingBalance,
        totalDeposits: sumDeposits,
        totalWithdrawals: sumWithdrawals,
        transactions: allTransactions,
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        processedAt: new Date().toISOString(),
      };

      setStatement(finalStatement);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setErrorState({ message: 'ยกเลิกการประมวลผลแล้ว' });
        return;
      }
      console.error('OCR Error:', err);
      const isHighDemand = 
        err.isHighDemand || 
        err.message?.includes('503') || 
        err.message?.includes('high demand') ||
        err.message?.includes('UNAVAILABLE') ||
        err.message?.includes('Timeout');

      setErrorState({
        message: isHighDemand
          ? 'เซิร์ฟเวอร์ AI มีผู้ใช้งานหนาแน่นชั่วคราว (Model High Demand - 503)'
          : (err.message || 'ไม่สามารถประมวลผลไฟล์ได้ กรุณาลองใหม่อีกครั้ง'),
        isHighDemand,
        details: err.details || err.message,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Row operations
  const handleUpdateTransaction = (updatedTx: Transaction) => {
    if (!statement) return;
    setStatement(prev => {
      if (!prev) return null;
      return {
        ...prev,
        transactions: prev.transactions.map(t => t.id === updatedTx.id ? updatedTx : t),
      };
    });
  };

  const handleDeleteTransaction = (id: string) => {
    if (!statement) return;
    setStatement(prev => {
      if (!prev) return null;
      return {
        ...prev,
        transactions: prev.transactions.filter(t => t.id !== id),
      };
    });
  };

  const handleAddTransaction = (newTx: Transaction) => {
    if (!statement) return;
    setStatement(prev => {
      if (!prev) return null;
      return {
        ...prev,
        transactions: [...prev.transactions, newTx],
      };
    });
  };

  // Auto Recalculate
  const handleAutoRecalculate = () => {
    if (!statement) return;
    const updated = recalculateRunningBalances(statement);
    setStatement(updated);
  };

  // Reset to upload screen
  const handleUploadNewFile = () => {
    setStatement(null);
    setSelectedFile(null);
    setUploadedPdfUrl(null);
    setErrorState(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-tr from-indigo-600 to-violet-500 rounded-xl shadow-lg shadow-indigo-500/20 text-white">
              <Building className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base tracking-tight text-white">
                  Bank Statement OCR AI
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  รองรับ PDF หลายหน้า
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                ระบบแปลงสเตทเม้นท์ธนาคารพร้อมตรวจสอบความถูกต้องและกระทบยอดคณิตศาสตร์
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {statement && (
              <>
                <button
                  onClick={handleUploadNewFile}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 flex items-center gap-1.5 transition"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                  <span className="hidden sm:inline">แปลงไฟล์ใหม่</span>
                  <span className="sm:hidden">ไฟล์ใหม่</span>
                </button>

                <button
                  onClick={() => setIsAuditModalOpen(true)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 flex items-center gap-1.5 transition"
                >
                  <Calculator className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="hidden sm:inline">ตรวจสอบกระทบยอด</span>
                  <span className="sm:hidden">กระทบยอด</span>
                </button>

                {uploadedPdfUrl && (
                  <button
                    onClick={() => setIsPdfPreviewOpen(true)}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 flex items-center gap-1.5 transition"
                  >
                    <Eye className="w-3.5 h-3.5 text-slate-400" />
                    <span className="hidden sm:inline">ดู PDF ต้นฉบับ</span>
                    <span className="sm:hidden">ดู PDF</span>
                  </button>
                )}

                <button
                  onClick={() => setIsExportOpen(true)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 flex items-center gap-1.5 transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>ส่งออก (Excel / CSV)</span>
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 flex-1 w-full space-y-6">
        {/* Upload Zone & Instructions */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl backdrop-blur-md">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-6">
            {/* Drag & Drop Area */}
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
              className={`flex-1 border-2 border-dashed rounded-xl p-6 sm:p-8 text-center cursor-pointer transition flex flex-col items-center justify-center gap-3 ${
                selectedFile
                  ? 'border-indigo-500 bg-indigo-950/20'
                  : 'border-slate-700 hover:border-slate-500 bg-slate-950/40 hover:bg-slate-950/60'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileChange(e.target.files[0]);
                  }
                }}
              />

              <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-full">
                <UploadCloud className="w-8 h-8" />
              </div>

              <div>
                <p className="text-sm font-semibold text-white">
                  {selectedFile ? selectedFile.name : 'ลากไฟล์ PDF สเตทเม้นท์มาวางที่นี่ หรือคลิกเพื่อเลือกไฟล์'}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  รองรับเอกสาร PDF ทุกธนาคาร • รองรับไฟล์ต่อเนื่องหลายหน้า (Multi-page PDF)
                </p>
              </div>

              {selectedFile && (
                <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-mono text-indigo-300">
                  <span className="bg-indigo-500/10 border border-indigo-500/30 px-3 py-1 rounded-full flex items-center gap-1.5 font-bold">
                    <Layers className="w-3.5 h-3.5 text-indigo-400" />
                    ตรวจพบ: {detectedPageCount} หน้า (Pages)
                  </span>
                  <span className="bg-slate-800/80 px-3 py-1 rounded-full flex items-center gap-1.5 text-slate-300">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </span>
                </div>
              )}
            </div>

            {/* Upload Options & Start OCR Button */}
            <div className="w-full lg:w-80 flex flex-col justify-between gap-4">
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    ระบุธนาคาร (Bank Preset - ไม่บังคับ):
                  </label>
                  <select
                    value={bankHint}
                    onChange={(e) => setBankHint(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="auto">🔍 ตรวจหาอัตโนมัติ (Auto Detect All Banks)</option>
                    <option value="KBANK">ธนาคารกสิกรไทย (KASIKORNBANK)</option>
                    <option value="SCB">ธนาคารไทยพาณิชย์ (SCB)</option>
                    <option value="BBL">ธนาคารกรุงเทพ (Bangkok Bank)</option>
                    <option value="KTB">ธนาคารกรุงไทย (Krungthai Bank)</option>
                    <option value="TTB">ธนาคารทหารไทยธนชาต (TTB)</option>
                    <option value="BAY">ธนาคารกรุงศรีอยุธยา (Krungsri)</option>
                    <option value="GSB">ธนาคารออมสิน (GSB)</option>
                    <option value="UOB">ธนาคารยูโอบี (UOB)</option>
                    <option value="INTERNATIONAL">ธนาคารต่างประเทศ (Chase / HSBC / Citi / DBS)</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 text-[11px] text-slate-400 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>ความปลอดภัยระดับสูง ประมวลผลผ่านเซิร์ฟเวอร์เข้ารหัส ไม่บันทึกข้อมูลส่วนบุคคล</span>
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={handleProcessOcr}
                disabled={!selectedFile || isProcessing}
                className={`w-full py-3 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg transition ${
                  !selectedFile || isProcessing
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30'
                }`}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>กำลังประมวลผล {detectedPageCount} หน้า...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>เริ่มแปลง Statement ({detectedPageCount} หน้า) ด้วย AI</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Detailed Page-by-Page Progress */}
          {isProcessing && (
            <div className="mt-5">
              <ProcessingProgress
                totalPages={detectedPageCount}
                currentPage={processingCurrentPage}
                extractedCount={extractedRowCount}
                pageStatusMap={pageStatusMap}
                fileName={selectedFile?.name}
                fileSizeMb={selectedFile ? selectedFile.size / 1024 / 1024 : undefined}
                bankHint={bankHint}
                onCancel={handleCancelProcessing}
              />
            </div>
          )}

          {/* Error Message with Immediate Retry Action */}
          {errorState && (
            <div className={`mt-4 p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs ${
              errorState.isHighDemand
                ? 'bg-amber-950/40 border-amber-500/40 text-amber-200'
                : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
            }`}>
              <div className="flex items-start gap-2.5">
                <AlertTriangle className={`w-5 h-5 shrink-0 mt-0.5 ${
                  errorState.isHighDemand ? 'text-amber-400' : 'text-rose-400'
                }`} />
                <div>
                  <div className="font-semibold text-sm">
                    {errorState.message}
                  </div>
                  <p className="mt-0.5 text-xs opacity-90 leading-relaxed">
                    {errorState.isHighDemand
                      ? 'คำขอจากผู้ใช้งานทั่วโลกพุ่งสูงขึ้นชั่วคราว (Spikes in demand are temporary) คุณสามารถกดปุ่ม "ลองอีกครั้งทันที" ระบบจะสลับโมเดลสำรองให้อัตโนมัติ'
                      : (errorState.details || 'กรุณาตรวจสอบไฟล์แล้วลองใหม่อีกครั้ง')}
                  </p>
                </div>
              </div>

              {selectedFile && (
                <button
                  onClick={handleProcessOcr}
                  disabled={isProcessing}
                  className="px-3.5 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/50 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>ลองอีกครั้งทันที (Retry)</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* If statement has been processed, render the complete dashboard */}
        {statement ? (
          <>
            {/* Statement Overview & Key Metrics */}
            <StatementSummary
              statement={statement}
              reconciliation={reconciliationSummary}
              onAutoRecalculate={handleAutoRecalculate}
            />

            {/* Tab Switcher: Transactions vs Analytics */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('transactions')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                    activeTab === 'transactions'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  <ListFilter className="w-4 h-4" />
                  ตารางรายการเดินบัญชี ({statement.transactions.length})
                </button>
                <button
                  onClick={() => setActiveTab('analytics')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                    activeTab === 'analytics'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  <BarChart3 className="w-4 h-4" />
                  วิเคราะห์กระแสเงินสด & หมวดหมู่ (Analytics)
                </button>
              </div>

              <div className="text-xs text-slate-400 font-mono hidden sm:block">
                เอกสาร: {statement.fileName || 'statement.pdf'} ({statement.pageCount || detectedPageCount} หน้า)
              </div>
            </div>

            {/* Tab 1: Transaction Table */}
            {activeTab === 'transactions' && (
              <TransactionTable
                transactions={reconciledTransactions}
                totalPages={statement.pageCount || detectedPageCount}
                currency={statement.currency}
                onUpdateTransaction={handleUpdateTransaction}
                onDeleteTransaction={handleDeleteTransaction}
                onAddTransaction={handleAddTransaction}
              />
            )}

            {/* Tab 2: Analytics & Visual Charts */}
            {activeTab === 'analytics' && (
              <div className="space-y-5">
                <CashflowChart
                  transactions={statement.transactions}
                  currency={statement.currency}
                />
                <CategoryBreakdown
                  transactions={statement.transactions}
                  currency={statement.currency}
                />
              </div>
            )}
          </>
        ) : !isProcessing ? (
          /* Empty Landing Guidance when no statement is loaded yet */
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-8 sm:p-12 text-center max-w-3xl mx-auto space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto shadow-inner">
              <FileSpreadsheet className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                พร้อมแปลงเอกสารสเตทเม้นท์ PDF หลายหน้า
              </h3>
              <p className="text-sm text-slate-400 mt-2 max-w-lg mx-auto leading-relaxed">
                อัปโหลดไฟล์ PDF รายการเดินบัญชีธนาคาร ระบบ AI จะทำการสแกนทุกหน้า คัดแยกยอดเงินฝาก-ถอน และตรวจสอบความถูกต้องทางคณิตศาสตร์แบบบรรทัดต่อบรรทัด
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left pt-2">
              <div className="p-4 bg-slate-950/60 border border-slate-800/90 rounded-xl">
                <div className="text-emerald-400 font-bold text-xs uppercase flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> รองรับหลายหน้า
                </div>
                <div className="text-xs text-slate-300 mt-1.5 font-medium">สแกนต่อเนื่อง 1-20+ หน้า</div>
                <div className="text-[11px] text-slate-500 mt-0.5">ระบุเลขหน้าของทุกรายการเพื่อตรวจทานกับต้นฉบับ</div>
              </div>

              <div className="p-4 bg-slate-950/60 border border-slate-800/90 rounded-xl">
                <div className="text-indigo-400 font-bold text-xs uppercase flex items-center gap-1.5">
                  <Calculator className="w-4 h-4" /> กระทบยอด 100%
                </div>
                <div className="text-xs text-slate-300 mt-1.5 font-medium">พิสูจน์ความถูกต้องคณิตศาสตร์</div>
                <div className="text-[11px] text-slate-500 mt-0.5">ตรวจยอดคงเหลือเดิม + ฝาก - ถอน = ยอดใหม่</div>
              </div>

              <div className="p-4 bg-slate-950/60 border border-slate-800/90 rounded-xl">
                <div className="text-amber-400 font-bold text-xs uppercase flex items-center gap-1.5">
                  <Download className="w-4 h-4" /> ส่งออก Excel & CSV
                </div>
                <div className="text-xs text-slate-300 mt-1.5 font-medium">พร้อมใช้งานโปรแกรมบัญชี</div>
                <div className="text-[11px] text-slate-500 mt-0.5">ไฟล์ Excel (.xlsx) และ CSV UTF-8 ภาษาไทยไม่เพี้ยน</div>
              </div>
            </div>
          </div>
        ) : null}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-950 py-6 mt-12 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-400">Bank Statement OCR & Audit AI</span>
            <span>•</span>
            <span>ความแม่นยำสูงสำหรับการเงินและการบัญชี</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400 text-[11px]">
            <span>รองรับ PDF หลายหน้า</span>
            <span>กระทบยอดคณิตศาสตร์ (Reconciliation)</span>
            <span>ส่งออก Excel / CSV UTF-8</span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      {statement && (
        <>
          <ExportModal
            isOpen={isExportOpen}
            onClose={() => setIsExportOpen(false)}
            statement={statement}
          />

          <PdfPreviewModal
            isOpen={isPdfPreviewOpen}
            onClose={() => setIsPdfPreviewOpen(false)}
            pdfUrl={uploadedPdfUrl}
            fileName={statement.fileName}
            pageCount={statement.pageCount}
          />

          <AuditDetailsModal
            isOpen={isAuditModalOpen}
            onClose={() => setIsAuditModalOpen(false)}
            statement={statement}
            reconciliation={reconciliationSummary}
            onAutoRecalculate={handleAutoRecalculate}
          />
        </>
      )}
    </div>
  );
}
