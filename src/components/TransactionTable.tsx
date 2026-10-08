import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  CheckCircle2, 
  AlertCircle, 
  Edit3, 
  Trash2, 
  Plus, 
  X, 
  Save, 
  ArrowUpDown,
  Layers,
  ChevronDown,
  Info
} from 'lucide-react';
import { Transaction } from '../types/statement';
import { formatCurrency } from '../utils/reconciliation';

interface Props {
  transactions: Transaction[];
  totalPages: number;
  currency?: string;
  onUpdateTransaction: (updatedTx: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
  onAddTransaction: (newTx: Transaction) => void;
}

export const TransactionTable: React.FC<Props> = ({
  transactions,
  totalPages,
  currency = 'THB',
  onUpdateTransaction,
  onDeleteTransaction,
  onAddTransaction,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'deposits' | 'withdrawals' | 'discrepancies'>('all');
  const [selectedPage, setSelectedPage] = useState<number | 'all'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  // Table pagination state for hundreds of transactions
  const [tablePage, setTablePage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number | 'all'>(50);

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Transaction>>({});

  // Adding new transaction modal/row state
  const [isAdding, setIsAdding] = useState(false);
  const [newTxForm, setNewTxForm] = useState<Partial<Transaction>>({
    pageNumber: 1,
    transactionDate: new Date().toISOString().split('T')[0],
    dateTime: '',
    channel: 'TRANSFER',
    code: 'TRFR',
    description: '',
    withdrawal: 0,
    deposit: 0,
    balance: 0,
    category: 'ทั่วไป (General)',
  });

  // Extract unique categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach(t => {
      if (t.category) set.add(t.category);
    });
    return Array.from(set);
  }, [transactions]);

  // Filtered transactions
  const filtered = useMemo(() => {
    return transactions.filter(tx => {
      // Search
      const searchStr = `${tx.description} ${tx.code || ''} ${tx.channel || ''} ${tx.referenceNo || ''} ${tx.transactionDate}`.toLowerCase();
      if (searchTerm && !searchStr.includes(searchTerm.toLowerCase())) {
        return false;
      }

      // Filter Type
      if (filterType === 'deposits' && tx.deposit <= 0) return false;
      if (filterType === 'withdrawals' && tx.withdrawal <= 0) return false;
      if (filterType === 'discrepancies' && tx.isReconciled !== false) return false;

      // Page
      if (selectedPage !== 'all' && tx.pageNumber !== selectedPage) return false;

      // Category
      if (selectedCategory !== 'all' && tx.category !== selectedCategory) return false;

      return true;
    });
  }, [transactions, searchTerm, filterType, selectedPage, selectedCategory]);

  // Calculate paginated rows
  const totalFilteredPages = pageSize === 'all' ? 1 : Math.ceil(filtered.length / (pageSize as number)) || 1;
  const paginatedRows = useMemo(() => {
    if (pageSize === 'all') return filtered;
    const start = (tablePage - 1) * (pageSize as number);
    return filtered.slice(start, start + (pageSize as number));
  }, [filtered, tablePage, pageSize]);

  // Adjust tablePage if out of bounds after filter change
  useEffect(() => {
    if (tablePage > totalFilteredPages) {
      setTablePage(1);
    }
  }, [totalFilteredPages, tablePage]);

  const handleStartEdit = (tx: Transaction) => {
    setEditingId(tx.id);
    setEditForm({ ...tx });
  };

  const handleSaveEdit = () => {
    if (editingId && editForm) {
      onUpdateTransaction(editForm as Transaction);
      setEditingId(null);
      setEditForm({});
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleSaveNew = () => {
    if (!newTxForm.description) return;
    const created: Transaction = {
      id: `tx-new-${Date.now()}`,
      pageNumber: Number(newTxForm.pageNumber) || 1,
      dateTime: newTxForm.dateTime || newTxForm.transactionDate || '',
      transactionDate: newTxForm.transactionDate || '',
      channel: newTxForm.channel || 'K PLUS',
      code: newTxForm.code || 'TRFR',
      description: newTxForm.description || '',
      referenceNo: newTxForm.referenceNo || '',
      withdrawal: Number(newTxForm.withdrawal) || 0,
      deposit: Number(newTxForm.deposit) || 0,
      balance: Number(newTxForm.balance) || 0,
      category: newTxForm.category || 'ทั่วไป',
    };
    onAddTransaction(created);
    setIsAdding(false);
    setNewTxForm({
      pageNumber: 1,
      transactionDate: new Date().toISOString().split('T')[0],
      withdrawal: 0,
      deposit: 0,
      balance: 0,
      category: 'ทั่วไป (General)',
    });
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl overflow-hidden backdrop-blur-md">
      {/* Control Bar: Search, Filters, Add Button */}
      <div className="p-4 sm:p-5 border-b border-slate-800 space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="ค้นหารายการ (คำอธิบาย, รหัส, ช่องทาง, เลขอ้างอิง)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Action: Add Transaction */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsAdding(true)}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              เพิ่มรายการ (Add Row)
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-slate-400 flex items-center gap-1 mr-1">
              <Filter className="w-3.5 h-3.5" /> กรอง:
            </span>
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-lg font-medium transition ${
                filterType === 'all'
                  ? 'bg-slate-700 text-white font-semibold'
                  : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
              }`}
            >
              ทั้งหมด ({transactions.length})
            </button>
            <button
              onClick={() => setFilterType('deposits')}
              className={`px-3 py-1.5 rounded-lg font-medium transition ${
                filterType === 'deposits'
                  ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 font-semibold'
                  : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
              }`}
            >
              เงินเข้า/ฝาก ({transactions.filter(t => t.deposit > 0).length})
            </button>
            <button
              onClick={() => setFilterType('withdrawals')}
              className={`px-3 py-1.5 rounded-lg font-medium transition ${
                filterType === 'withdrawals'
                  ? 'bg-rose-600/30 text-rose-300 border border-rose-500/40 font-semibold'
                  : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
              }`}
            >
              เงินออก/ถอน ({transactions.filter(t => t.withdrawal > 0).length})
            </button>
            {transactions.some(t => t.isReconciled === false) && (
              <button
                onClick={() => setFilterType('discrepancies')}
                className={`px-3 py-1.5 rounded-lg font-medium transition ${
                  filterType === 'discrepancies'
                    ? 'bg-amber-600/30 text-amber-300 border border-amber-500/40 font-semibold'
                    : 'bg-slate-800/60 text-amber-400/80 hover:text-amber-200'
                }`}
              >
                พบผลต่าง ({transactions.filter(t => t.isReconciled === false).length})
              </button>
            )}
          </div>

          {/* Page Selector & Category Selector */}
          <div className="flex items-center gap-2">
            {totalPages > 1 && (
              <div className="flex items-center gap-1.5 bg-slate-950/60 px-2.5 py-1 rounded-lg border border-slate-800">
                <Layers className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-400">หน้า:</span>
                <select
                  value={selectedPage}
                  onChange={(e) => setSelectedPage(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                  className="bg-transparent text-slate-200 focus:outline-none text-xs font-medium cursor-pointer"
                >
                  <option value="all" className="bg-slate-900 text-slate-200">ทุกหน้า (1-{totalPages})</option>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                    <option key={p} value={p} className="bg-slate-900 text-slate-200">หน้า {p}</option>
                  ))}
                </select>
              </div>
            )}

            {categories.length > 0 && (
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-slate-950/60 text-slate-200 border border-slate-800 px-2.5 py-1 rounded-lg focus:outline-none text-xs font-medium cursor-pointer"
              >
                <option value="all" className="bg-slate-900 text-slate-200">ทุกหมวดหมู่ ({categories.length})</option>
                {categories.map(cat => (
                  <option key={cat} value={cat} className="bg-slate-900 text-slate-200">{cat}</option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

      {/* New Transaction Form Drawer (if adding) */}
      {isAdding && (
        <div className="p-4 bg-indigo-950/30 border-b border-indigo-500/30 animate-fadeIn">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-indigo-200 flex items-center gap-2">
              <Plus className="w-4 h-4 text-indigo-400" /> เพิ่มรายการใหม่ (Insert Transaction)
            </h4>
            <button 
              onClick={() => setIsAdding(false)}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="text-slate-400 block mb-1">วันที่ (Date)</label>
              <input
                type="text"
                placeholder="DD/MM/YYYY"
                value={newTxForm.transactionDate || ''}
                onChange={(e) => setNewTxForm({ ...newTxForm, transactionDate: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">หน้า PDF (Page #)</label>
              <input
                type="number"
                min={1}
                value={newTxForm.pageNumber || 1}
                onChange={(e) => setNewTxForm({ ...newTxForm, pageNumber: Number(e.target.value) })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">ช่องทาง / รหัส (Channel/Code)</label>
              <input
                type="text"
                placeholder="K PLUS / TRFR"
                value={newTxForm.channel || ''}
                onChange={(e) => setNewTxForm({ ...newTxForm, channel: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">หมวดหมู่ (Category)</label>
              <input
                type="text"
                placeholder="เช่น รายรับธุรกิจ, ค่าอาหาร"
                value={newTxForm.category || ''}
                onChange={(e) => setNewTxForm({ ...newTxForm, category: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-slate-400 block mb-1">คำอธิบายรายการ (Description) *</label>
              <input
                type="text"
                placeholder="ระบุรายละเอียดรายการ..."
                value={newTxForm.description || ''}
                onChange={(e) => setNewTxForm({ ...newTxForm, description: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
              />
            </div>
            <div>
              <label className="text-rose-400 block mb-1">ยอดถอน/จ่าย (Withdrawal)</label>
              <input
                type="number"
                step="0.01"
                value={newTxForm.withdrawal || ''}
                onChange={(e) => setNewTxForm({ ...newTxForm, withdrawal: parseFloat(e.target.value) || 0 })}
                className="w-full bg-slate-900 border border-rose-900/50 rounded-lg px-2.5 py-1.5 text-rose-300 font-mono"
              />
            </div>
            <div>
              <label className="text-emerald-400 block mb-1">ยอดฝาก/เข้า (Deposit)</label>
              <input
                type="number"
                step="0.01"
                value={newTxForm.deposit || ''}
                onChange={(e) => setNewTxForm({ ...newTxForm, deposit: parseFloat(e.target.value) || 0 })}
                className="w-full bg-slate-900 border border-emerald-900/50 rounded-lg px-2.5 py-1.5 text-emerald-300 font-mono"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-indigo-400 block mb-1">ยอดคงเหลือ (Balance)</label>
              <input
                type="number"
                step="0.01"
                value={newTxForm.balance || ''}
                onChange={(e) => setNewTxForm({ ...newTxForm, balance: parseFloat(e.target.value) || 0 })}
                className="w-full bg-slate-900 border border-indigo-900/50 rounded-lg px-2.5 py-1.5 text-indigo-300 font-mono"
              />
            </div>
            <div className="md:col-span-2 flex items-end justify-end gap-2">
              <button
                onClick={() => setIsAdding(false)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg"
              >
                ยกเลิก (Cancel)
              </button>
              <button
                onClick={handleSaveNew}
                disabled={!newTxForm.description}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg font-semibold flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" /> บันทึกรายการ (Save)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table Container */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-300 border-collapse">
          <thead>
            <tr className="bg-slate-950/80 text-slate-400 uppercase tracking-wider border-b border-slate-800 font-semibold">
              <th className="py-3 px-3 text-center w-12">#</th>
              <th className="py-3 px-2 text-center w-14">หน้า</th>
              <th className="py-3 px-3 w-28">วันที่ / เวลา</th>
              <th className="py-3 px-3 w-28">ช่องทาง / รหัส</th>
              <th className="py-3 px-4 min-w-[240px]">รายละเอียดรายการ</th>
              <th className="py-3 px-3 w-32">หมวดหมู่</th>
              <th className="py-3 px-4 text-right w-32 text-rose-400">ถอน / จ่าย ({currency})</th>
              <th className="py-3 px-4 text-right w-32 text-emerald-400">ฝาก / รับ ({currency})</th>
              <th className="py-3 px-4 text-right w-36 text-indigo-300">คงเหลือ ({currency})</th>
              <th className="py-3 px-3 text-center w-24">ตรวจสอบ</th>
              <th className="py-3 px-3 text-center w-20">จัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-sans">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={11} className="py-12 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Info className="w-7 h-7 text-slate-600" />
                    <span>ไม่พบรายการที่ตรงกับเงื่อนไขการค้นหา</span>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedRows.map((tx, idx) => {
                const rowNumber = (pageSize === 'all' ? 0 : (tablePage - 1) * (pageSize as number)) + idx + 1;
                const isEditing = editingId === tx.id;

                if (isEditing) {
                  return (
                    <tr key={tx.id} className="bg-indigo-950/20 border-indigo-500/30">
                      <td className="py-2.5 px-3 text-center text-slate-400">{rowNumber}</td>
                      <td className="py-2.5 px-2">
                        <input
                          type="number"
                          value={editForm.pageNumber || 1}
                          onChange={(e) => setEditForm({ ...editForm, pageNumber: Number(e.target.value) })}
                          className="w-12 bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-center text-white"
                        />
                      </td>
                      <td className="py-2.5 px-3">
                        <input
                          type="text"
                          value={editForm.transactionDate || ''}
                          onChange={(e) => setEditForm({ ...editForm, transactionDate: e.target.value })}
                          className="w-24 bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-white"
                        />
                      </td>
                      <td className="py-2.5 px-3">
                        <input
                          type="text"
                          value={editForm.channel || ''}
                          onChange={(e) => setEditForm({ ...editForm, channel: e.target.value })}
                          className="w-24 bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-white"
                        />
                      </td>
                      <td className="py-2.5 px-4">
                        <input
                          type="text"
                          value={editForm.description || ''}
                          onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white"
                        />
                      </td>
                      <td className="py-2.5 px-3">
                        <input
                          type="text"
                          value={editForm.category || ''}
                          onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                          className="w-28 bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-white"
                        />
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <input
                          type="number"
                          step="0.01"
                          value={editForm.withdrawal ?? 0}
                          onChange={(e) => setEditForm({ ...editForm, withdrawal: parseFloat(e.target.value) || 0 })}
                          className="w-24 bg-slate-900 border border-rose-900/60 rounded px-1.5 py-1 text-right text-rose-300 font-mono"
                        />
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <input
                          type="number"
                          step="0.01"
                          value={editForm.deposit ?? 0}
                          onChange={(e) => setEditForm({ ...editForm, deposit: parseFloat(e.target.value) || 0 })}
                          className="w-24 bg-slate-900 border border-emerald-900/60 rounded px-1.5 py-1 text-right text-emerald-300 font-mono"
                        />
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <input
                          type="number"
                          step="0.01"
                          value={editForm.balance ?? 0}
                          onChange={(e) => setEditForm({ ...editForm, balance: parseFloat(e.target.value) || 0 })}
                          className="w-28 bg-slate-900 border border-indigo-900/60 rounded px-1.5 py-1 text-right text-indigo-300 font-mono"
                        />
                      </td>
                      <td className="py-2.5 px-3 text-center text-slate-500">-</td>
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={handleSaveEdit}
                            className="p-1 bg-emerald-600/30 text-emerald-300 hover:bg-emerald-600/50 rounded"
                            title="บันทึก"
                          >
                            <Save className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="p-1 bg-slate-800 text-slate-400 hover:text-white rounded"
                            title="ยกเลิก"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr 
                    key={tx.id} 
                    className={`hover:bg-slate-800/40 transition group ${
                      tx.isReconciled === false ? 'bg-amber-950/15' : ''
                    }`}
                  >
                    {/* Index */}
                    <td className="py-3 px-3 text-center text-slate-500 font-mono">
                      {rowNumber}
                    </td>

                    {/* Page */}
                    <td className="py-3 px-2 text-center">
                      <span className="inline-block px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-300 font-mono text-[11px] border border-slate-700/50">
                        P.{tx.pageNumber || 1}
                      </span>
                    </td>

                    {/* Date / Time */}
                    <td className="py-3 px-3">
                      <div className="font-medium text-slate-200">{tx.transactionDate}</div>
                      {tx.dateTime && tx.dateTime !== tx.transactionDate && (
                        <div className="text-[11px] text-slate-500 font-mono">
                          {tx.dateTime.includes(' ') ? tx.dateTime.split(' ')[1] : tx.dateTime}
                        </div>
                      )}
                    </td>

                    {/* Channel / Code */}
                    <td className="py-3 px-3">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-mono text-xs text-slate-300 font-medium">{tx.code || '-'}</span>
                        <span className="text-[10px] text-slate-400">{tx.channel || '-'}</span>
                      </div>
                    </td>

                    {/* Description */}
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-100 group-hover:text-white transition">
                        {tx.description}
                      </div>
                      {tx.referenceNo && (
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                          Ref: {tx.referenceNo}
                        </div>
                      )}
                    </td>

                    {/* Category */}
                    <td className="py-3 px-3">
                      {tx.category ? (
                        <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-800 text-slate-300 border border-slate-700/80">
                          {tx.category}
                        </span>
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
                    </td>

                    {/* Withdrawal */}
                    <td className="py-3 px-4 text-right font-mono font-medium">
                      {tx.withdrawal > 0 ? (
                        <span className="text-rose-400">
                          -{formatCurrency(tx.withdrawal, '')}
                        </span>
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
                    </td>

                    {/* Deposit */}
                    <td className="py-3 px-4 text-right font-mono font-medium">
                      {tx.deposit > 0 ? (
                        <span className="text-emerald-400">
                          +{formatCurrency(tx.deposit, '')}
                        </span>
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
                    </td>

                    {/* Balance */}
                    <td className="py-3 px-4 text-right font-mono font-semibold text-slate-100">
                      {formatCurrency(tx.balance, '')}
                    </td>

                    {/* Verification Status */}
                    <td className="py-3 px-3 text-center">
                      {tx.isReconciled === false ? (
                        <span 
                          className="inline-flex items-center gap-1 text-[11px] text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full font-medium"
                          title={`ยอดคำนวณต่าง: ${tx.balanceDiff ? tx.balanceDiff : 'ไม่ตรง'}`}
                        >
                          <AlertCircle className="w-3 h-3 text-amber-400" />
                          ต่าง {tx.balanceDiff ? Math.abs(tx.balanceDiff).toFixed(2) : ''}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full font-medium">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          ตรง
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-1 opacity-60 group-hover:opacity-100 transition">
                        <button
                          onClick={() => handleStartEdit(tx)}
                          className="p-1 hover:bg-slate-700/80 rounded text-slate-400 hover:text-indigo-300 transition"
                          title="แก้ไขรายการ"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteTransaction(tx.id)}
                          className="p-1 hover:bg-rose-900/40 rounded text-slate-400 hover:text-rose-400 transition"
                          title="ลบรายการ"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Table Footer Count & Pagination */}
      <div className="p-3.5 bg-slate-950/70 border-t border-slate-800 text-xs text-slate-400 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            แสดง <span className="font-semibold text-slate-200">
              {filtered.length === 0 ? 0 : pageSize === 'all' ? `1-${filtered.length}` : `${(tablePage - 1) * (pageSize as number) + 1}-${Math.min(tablePage * (pageSize as number), filtered.length)}`}
            </span> จากทั้งหมด <span className="font-semibold text-slate-200">{filtered.length}</span> รายการ
            {transactions.length !== filtered.length && (
              <span className="text-slate-500"> (กรองจาก {transactions.length} รายการ)</span>
            )}
          </div>

          {/* Page Size Selector */}
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-lg text-[11px]">
            <span>แถวต่อหน้า:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                const val = e.target.value === 'all' ? 'all' : Number(e.target.value);
                setPageSize(val);
                setTablePage(1);
              }}
              className="bg-transparent text-slate-200 font-semibold focus:outline-none cursor-pointer"
            >
              <option value={25} className="bg-slate-900 text-slate-200">25</option>
              <option value={50} className="bg-slate-900 text-slate-200">50</option>
              <option value={100} className="bg-slate-900 text-slate-200">100</option>
              <option value="all" className="bg-slate-900 text-slate-200">ทั้งหมด ({filtered.length})</option>
            </select>
          </div>
        </div>

        {/* Pagination Navigation */}
        {pageSize !== 'all' && totalFilteredPages > 1 && (
          <div className="flex items-center gap-1.5 font-mono">
            <button
              onClick={() => setTablePage(p => Math.max(1, p - 1))}
              disabled={tablePage === 1}
              className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-slate-300 border border-slate-800 text-xs transition"
            >
              ◀ ก่อนหน้า
            </button>
            <span className="px-2.5 py-1 text-slate-300 text-xs">
              หน้า <span className="font-bold text-white">{tablePage}</span> / {totalFilteredPages}
            </span>
            <button
              onClick={() => setTablePage(p => Math.min(totalFilteredPages, p + 1))}
              disabled={tablePage >= totalFilteredPages}
              className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-slate-300 border border-slate-800 text-xs transition"
            >
              ถัดไป ▶
            </button>
          </div>
        )}

        <div className="flex items-center gap-3 text-[11px] font-mono">
          <span className="text-emerald-400">
            ยอดฝาก: +{formatCurrency(filtered.reduce((acc, t) => acc + (t.deposit || 0), 0), currency)}
          </span>
          <span className="text-rose-400">
            ยอดถอน: -{formatCurrency(filtered.reduce((acc, t) => acc + (t.withdrawal || 0), 0), currency)}
          </span>
        </div>
      </div>
    </div>
  );
};
