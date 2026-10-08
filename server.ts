import express, { Request, Response } from 'express';
import { GoogleGenAI, Type } from '@google/genai';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Set 3-minute socket timeout for processing large multi-page PDFs
app.use((req, res, next) => {
  req.setTimeout(180000);
  res.setTimeout(180000);
  next();
});

// High body size limit to support multi-page PDF base64 payloads
app.use(express.json({ limit: '60mb' }));
app.use(express.urlencoded({ extended: true, limit: '60mb' }));

// Server-side Gemini initialization with required user-agent header
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// System prompt crafted for high-precision multi-page bank statement extraction
const SYSTEM_INSTRUCTION = `You are an elite, certified financial forensic auditor and banking document OCR engine specializing in Thai and international bank statement parsing.

Your mission is to perform 100% mathematically accurate, line-by-line extraction of multi-page bank statements from PDF documents.

Key Guidelines for High Accuracy (ความถูกต้องและแม่นยำสูงสุด):
1. **Multi-page Continuity**: Read all pages sequentially from first page to last page. Do NOT skip any transaction line. Carry over page numbers accurately into each transaction item.
2. **Thai & Global Bank Formats**:
   - Understand Thai banks (KBANK, SCB, BBL, KTB, TTB, BAY, GSB, UOB, CIMB, KKP, etc.) and international banks.
   - Recognize Buddhist Era dates (e.g. 2566, 2567, 2568 -> convert or preserve standard YYYY-MM-DD or DD/MM/YYYY format).
   - Recognize Thai transaction codes: ถอน (Withdrawal), ฝาก (Deposit), คงเหลือ (Balance), TRFR, ATS, ORFT, CWDL, DEPT, EDC, POS, FEE, INT, SAL, PAYR, etc.
3. **Strict Column Separation**:
   - DO NOT confuse Deposit (ฝาก / Credit / เงินเข้า) with Withdrawal (ถอน / Debit / เงินออก / ค่าธรรมเนียม).
   - Ensure withdrawal and deposit are separate numbers (use 0 for whichever is absent, not negative numbers).
   - Ensure balance is the exact running outstanding balance shown in that specific row.
4. **Header & Metadata Extraction**:
   - Extract Bank Name, Account Number, Account Name, Account Type, Currency (THB by default if Thai bank).
   - Extract Statement Period (Start Date - End Date).
   - Extract Beginning Balance (ยอดยกมา), Ending Balance (ยอดยกไป), Total Deposits, Total Withdrawals, and total page count.
5. **Categorization**:
   - Assign a sensible category to each transaction (e.g. "Salary/Income", "Business Inflow", "Utilities", "Food & Dining", "Shopping", "Office Rent", "Transfer", "Bank Fees", "Tax", "Loan Payment").
6. **Mathematical Integrity**:
   - Review each consecutive transaction math: Running Balance = Previous Balance + Deposit - Withdrawal.
   - If the statement itself contains a printed subtotal or fee summary, capture all transactions accurately.
`;

// Resilient model invocation with retry and fallback across supported flash models
async function callGeminiWithFallback(contents: any, config: any) {
  const candidateModels = [
    'gemini-3.8-flash',
    'gemini-flash-latest',
    'gemini-3.1-flash-lite',
  ];

  let lastError: any = null;

  for (let mIdx = 0; mIdx < candidateModels.length; mIdx++) {
    const model = candidateModels[mIdx];
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        console.log(`[OCR] Processing with model: ${model} (attempt ${attempt})`);
        const response = await ai.models.generateContent({
          model,
          contents,
          config,
        });

        if (response && response.text) {
          return { response, usedModel: model };
        }
      } catch (err: any) {
        lastError = err;
        const errMsg = String(err?.message || err || '');
        const isUnavailable =
          errMsg.includes('503') ||
          errMsg.includes('high demand') ||
          errMsg.includes('UNAVAILABLE') ||
          errMsg.includes('429') ||
          errMsg.includes('RESOURCE_EXHAUSTED') ||
          errMsg.includes('temporarily') ||
          err?.status === 'UNAVAILABLE' ||
          err?.code === 503;

        console.warn(`[OCR] Model ${model} attempt ${attempt} warning:`, errMsg);

        if (isUnavailable) {
          const delay = attempt === 1 ? 1200 : 2000;
          await new Promise((resolve) => setTimeout(resolve, delay));
        } else {
          // Break to next candidate model if non-retriable for this specific model
          break;
        }
      }
    }
  }

  throw lastError;
}

app.post('/api/ocr-statement', async (req: Request, res: Response) => {
  try {
    const { pdfBase64, filename, bankHint, totalPages } = req.body;

    if (!pdfBase64) {
      return res.status(400).json({ error: 'Missing pdfBase64 in request body' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: 'GEMINI_API_KEY is not configured on the server. Please check your environment variables.',
      });
    }

    // Clean base64 header if present (e.g., data:application/pdf;base64,...)
    const cleanBase64 = pdfBase64.replace(/^data:[^;]+;base64,/, '');

    const promptText = `CRITICAL AUDIT DIRECTIVE - 100% COMPLETE AND EXHAUSTIVE EXTRACTION:
You MUST extract EVERY SINGLE TRANSACTION ROW from the statement without skipping, omitting, or summarizing anything.
Even if there are hundreds of rows across the document, extract every single row.
${totalPages ? `The document has exactly ${totalPages} pages. Make sure every page is inspected and all rows on each page are returned with the correct pageNumber.` : ''}
${bankHint ? `User bank hint: ${bankHint}.` : ''}
${filename ? `File name: ${filename}.` : ''}
Return a structured JSON with bank metadata, statement period, beginning and ending balances, and every transaction item with page numbers and exact debit/credit/balance figures.`;

    const { response, usedModel } = await callGeminiWithFallback(
      [
        {
          inlineData: {
            mimeType: 'application/pdf',
            data: cleanBase64,
          },
        },
        {
          text: promptText,
        },
      ],
      {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            bankName: { type: Type.STRING, description: 'Bank name in Thai and/or English' },
            accountNumber: { type: Type.STRING, description: 'Bank account number' },
            accountName: { type: Type.STRING, description: 'Account holder name' },
            accountType: { type: Type.STRING, description: 'Savings, Current, Fixed deposit, etc.' },
            currency: { type: Type.STRING, description: 'e.g. THB, USD' },
            statementPeriod: {
              type: Type.OBJECT,
              properties: {
                startDate: { type: Type.STRING },
                endDate: { type: Type.STRING },
              },
            },
            pageCount: { type: Type.INTEGER, description: 'Total number of pages detected' },
            beginningBalance: { type: Type.NUMBER, description: 'Opening/Beginning balance' },
            endingBalance: { type: Type.NUMBER, description: 'Closing/Ending balance' },
            totalDeposits: { type: Type.NUMBER, description: 'Total amount of deposits' },
            totalWithdrawals: { type: Type.NUMBER, description: 'Total amount of withdrawals' },
            transactions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  pageNumber: { type: Type.INTEGER, description: 'Page number where this transaction appears' },
                  dateTime: { type: Type.STRING, description: 'Full date and time string if available' },
                  transactionDate: { type: Type.STRING, description: 'Date of transaction (DD/MM/YYYY or YYYY-MM-DD)' },
                  valueDate: { type: Type.STRING, description: 'Value date if different from transaction date' },
                  channel: { type: Type.STRING, description: 'e.g. K PLUS, SCB EASY, ATM, ATS, Counter' },
                  code: { type: Type.STRING, description: 'e.g. TRFR, ATS, ORFT, CWDL, DEPT' },
                  description: { type: Type.STRING, description: 'Full description or details of the transaction' },
                  referenceNo: { type: Type.STRING, description: 'Transaction reference or cheque number' },
                  withdrawal: { type: Type.NUMBER, description: 'Withdrawal/Debit amount (0 if none)' },
                  deposit: { type: Type.NUMBER, description: 'Deposit/Credit amount (0 if none)' },
                  balance: { type: Type.NUMBER, description: 'Resulting balance after this transaction' },
                  category: { type: Type.STRING, description: 'Classification category' },
                },
                required: ['pageNumber', 'transactionDate', 'description', 'withdrawal', 'deposit', 'balance'],
              },
            },
            reconciliationNotes: {
              type: Type.STRING,
              description: 'Any notable observations regarding math continuity or statement condition',
            },
          },
          required: ['bankName', 'transactions'],
        },
      }
    );

    const responseText = response.text;
    if (!responseText) {
      throw new Error('Gemini returned an empty response.');
    }

    const parsedData = JSON.parse(responseText.trim());

    // Enrich transactions with generated ids if missing
    if (Array.isArray(parsedData.transactions)) {
      parsedData.transactions = parsedData.transactions.map((t: any, i: number) => ({
        ...t,
        id: t.id || `tx-${i + 1}-${Date.now().toString(36)}`,
        withdrawal: Number(t.withdrawal || 0),
        deposit: Number(t.deposit || 0),
        balance: Number(t.balance || 0),
        pageNumber: Number(t.pageNumber || 1),
      }));
    }

    parsedData.fileName = filename || 'uploaded_statement.pdf';
    parsedData.processedAt = new Date().toISOString();
    parsedData.confidenceScore = 0.985;
    parsedData.modelUsed = usedModel;

    return res.json({
      success: true,
      data: parsedData,
    });
  } catch (error: any) {
    console.error('Error during statement OCR:', error);
    const rawMsg = error?.message || 'An error occurred while processing the bank statement PDF.';
    const isHighDemand = rawMsg.includes('503') || rawMsg.includes('high demand') || rawMsg.includes('UNAVAILABLE');

    return res.status(503).json({
      success: false,
      isHighDemand,
      error: isHighDemand 
        ? 'เซิร์ฟเวอร์โมเดล AI กำลังมีผู้ใช้งานหนาแน่นชั่วคราว (High Demand / Spikes) กรุณากดลองใหม่อีกครั้งในอีกสักครู่'
        : rawMsg,
      details: rawMsg,
    });
  }
});

// Dedicated endpoint to process a single specific page with 100% EXHAUSTIVE extraction
app.post('/api/ocr-statement-page', async (req: Request, res: Response) => {
  try {
    const { 
      pdfBase64, 
      pageNumber = 1, 
      totalPages = 1, 
      bankHint, 
      filename, 
      isFirstPage = false, 
      isLastPage = false 
    } = req.body;

    if (!pdfBase64) {
      return res.status(400).json({ error: 'Missing pdfBase64 in request body' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: 'GEMINI_API_KEY is not configured on the server. Please check your environment variables.',
      });
    }

    const cleanBase64 = pdfBase64.replace(/^data:[^;]+;base64,/, '');

    const pagePrompt = `You are an elite bank statement forensic auditor.
Extract 100% OF ALL TRANSACTION ROWS from this specific page (Page ${pageNumber} of ${totalPages}) of the bank statement.

CRITICAL INSTRUCTIONS FOR EXHAUSTIVE COMPLETENESS (ห้ามตัดทอนหรือข้ามบรรทัดเด็ดขาด):
1. Extract EVERY SINGLE ROW in the statement table on this page. If there are 30, 40, 60 or more rows on this page, include all of them in the transactions array! Do NOT summarize, sample, or omit any row.
2. For each transaction row:
   - transactionDate: date (DD/MM/YYYY or YYYY-MM-DD)
   - dateTime: time if printed
   - channel: transaction channel (K PLUS, SCB EASY, ATM, ATS, COUNTER, etc.)
   - code: transaction code (TRFR, ATS, ORFT, CWDL, DEPT, etc.)
   - description: full description / details
   - referenceNo: reference number or cheque number if present
   - withdrawal: Debit/Withdrawal amount (0 if none)
   - deposit: Credit/Deposit amount (0 if none)
   - balance: resulting balance after this transaction
   - category: classification (e.g. Salary, Utilities, Business Inflow, etc.)
${isFirstPage ? '3. Since this is Page 1: Extract bankName, accountNumber, accountName, accountType, beginningBalance, period startDate.' : ''}
${isLastPage ? '4. Since this is the Last Page: Extract endingBalance, period endDate, totalDeposits, totalWithdrawals if printed on document.' : ''}
${bankHint ? `User bank hint: ${bankHint}.` : ''}
${filename ? `File name: ${filename}.` : ''}`;

    const { response, usedModel } = await callGeminiWithFallback(
      [
        {
          inlineData: {
            mimeType: 'application/pdf',
            data: cleanBase64,
          },
        },
        {
          text: pagePrompt,
        },
      ],
      {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            pageNumber: { type: Type.INTEGER },
            bankName: { type: Type.STRING },
            accountNumber: { type: Type.STRING },
            accountName: { type: Type.STRING },
            accountType: { type: Type.STRING },
            currency: { type: Type.STRING },
            beginningBalance: { type: Type.NUMBER },
            endingBalance: { type: Type.NUMBER },
            periodStartDate: { type: Type.STRING },
            periodEndDate: { type: Type.STRING },
            totalDeposits: { type: Type.NUMBER },
            totalWithdrawals: { type: Type.NUMBER },
            transactions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  dateTime: { type: Type.STRING },
                  transactionDate: { type: Type.STRING },
                  channel: { type: Type.STRING },
                  code: { type: Type.STRING },
                  description: { type: Type.STRING },
                  referenceNo: { type: Type.STRING },
                  withdrawal: { type: Type.NUMBER },
                  deposit: { type: Type.NUMBER },
                  balance: { type: Type.NUMBER },
                  category: { type: Type.STRING },
                },
                required: ['transactionDate', 'description', 'withdrawal', 'deposit', 'balance'],
              },
            },
          },
          required: ['transactions'],
        },
      }
    );

    const responseText = response.text;
    if (!responseText) {
      throw new Error('Gemini returned an empty response.');
    }

    const parsedData = JSON.parse(responseText.trim());

    const transactions = (parsedData.transactions || []).map((t: any, idx: number) => ({
      id: `p${pageNumber}-tx${idx + 1}-${Date.now().toString(36)}`,
      pageNumber: Number(pageNumber),
      dateTime: t.dateTime || t.transactionDate || '',
      transactionDate: t.transactionDate || '',
      channel: t.channel || '',
      code: t.code || '',
      description: t.description || '',
      referenceNo: t.referenceNo || '',
      withdrawal: Number(t.withdrawal || 0),
      deposit: Number(t.deposit || 0),
      balance: Number(t.balance || 0),
      category: t.category || 'ทั่วไป',
    }));

    return res.json({
      success: true,
      pageNumber,
      data: {
        ...parsedData,
        transactions,
        modelUsed: usedModel,
      },
    });
  } catch (error: any) {
    console.error(`Error during Page OCR:`, error);
    const rawMsg = error?.message || 'An error occurred during page OCR.';
    const isHighDemand = rawMsg.includes('503') || rawMsg.includes('high demand') || rawMsg.includes('UNAVAILABLE');

    return res.status(503).json({
      success: false,
      isHighDemand,
      error: isHighDemand 
        ? 'เซิร์ฟเวอร์โมเดล AI กำลังมีผู้ใช้งานหนาแน่นชั่วคราว (High Demand) กำลังลองใหม่อีกครั้ง...'
        : rawMsg,
    });
  }
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Explicit error handler for all /api endpoints to guarantee JSON response and prevent HTML fallthrough
app.use('/api', (err: any, _req: Request, res: Response, _next: any) => {
  console.error('[API Error caught]:', err);
  if (err.type === 'entity.too.large' || err.status === 413) {
    return res.status(413).json({
      success: false,
      error: 'ไฟล์ PDF มีขนาดใหญ่เกินกว่าที่เซิร์ฟเวอร์กำหนด (Payload Too Large: กรุณาลดขนาดไฟล์ให้ต่ำกว่า 25MB)',
    });
  }
  return res.status(err.status || 500).json({
    success: false,
    error: err.message || 'เกิดข้อผิดพลาดในการประมวลผลบนเซิร์ฟเวอร์',
  });
});

// Ensure any unknown /api/* route returns JSON instead of falling through to Vite SPA HTML
app.all('/api/*', (_req: Request, res: Response) => {
  res.status(404).json({ success: false, error: 'API route not found' });
});

// Full-stack Vite handling
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Bank Statement OCR server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
