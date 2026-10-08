import React, { useState } from 'react';
import { TrendingUp, BarChart3, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { Transaction } from '../types/statement';
import { formatCurrency } from '../utils/reconciliation';

interface Props {
  transactions: Transaction[];
  currency?: string;
}

export const CashflowChart: React.FC<Props> = ({ transactions, currency = 'THB' }) => {
  const [hoveredPoint, setHoveredPoint] = useState<Transaction | null>(null);

  if (!transactions || transactions.length === 0) return null;

  // Calculate points for balance line
  const balances = transactions.map(t => t.balance || 0);
  const minBalance = Math.min(...balances);
  const maxBalance = Math.max(...balances);
  const balanceRange = maxBalance - minBalance || 1;

  // Chart dimensions
  const width = 800;
  const height = 180;
  const paddingX = 40;
  const paddingY = 25;

  const points = transactions.map((t, i) => {
    const x = paddingX + (i / Math.max(transactions.length - 1, 1)) * (width - 2 * paddingX);
    const normalizedY = (t.balance - minBalance) / balanceRange;
    const y = height - paddingY - normalizedY * (height - 2 * paddingY);
    return { x, y, tx: t };
  });

  const pathD = points.reduce((acc, curr, idx) => {
    if (idx === 0) return `M ${curr.x} ${curr.y}`;
    return `${acc} L ${curr.x} ${curr.y}`;
  }, '');

  // Fill area under the line
  const areaD = points.length > 0
    ? `${pathD} L ${points[points.length - 1].x} ${height - paddingY} L ${points[0].x} ${height - paddingY} Z`
    : '';

  // Calculate daily totals for inflow/outflow
  const totalIn = transactions.reduce((acc, t) => acc + (t.deposit || 0), 0);
  const totalOut = transactions.reduce((acc, t) => acc + (t.withdrawal || 0), 0);
  const netFlow = totalIn - totalOut;

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl backdrop-blur-md">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">แนวโน้มยอดเงินคงเหลือตามลำดับเวลา (Running Balance Trend)</h3>
            <p className="text-xs text-slate-400">การเคลื่อนไหวยอดคงเหลือตลอดรายการเดินบัญชี</p>
          </div>
        </div>

        {/* Quick Summary Pill */}
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 text-slate-300">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 inline-block"></span>
            <span>ยอดคงเหลือ</span>
          </div>
          <div className="flex items-center gap-1 text-emerald-400">
            <ArrowDownLeft className="w-3.5 h-3.5" />
            <span>เข้า: +{formatCurrency(totalIn, '')}</span>
          </div>
          <div className="flex items-center gap-1 text-rose-400">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>ออก: -{formatCurrency(totalOut, '')}</span>
          </div>
        </div>
      </div>

      {/* SVG Line Graph */}
      <div className="relative w-full overflow-hidden bg-slate-950/60 rounded-xl border border-slate-800/80 p-2">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-44 overflow-visible"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Horizontal Grid lines */}
          <line
            x1={paddingX}
            y1={paddingY}
            x2={width - paddingX}
            y2={paddingY}
            stroke="#334155"
            strokeDasharray="4 4"
            strokeWidth="0.8"
          />
          <line
            x1={paddingX}
            y1={height / 2}
            x2={width - paddingX}
            y2={height / 2}
            stroke="#334155"
            strokeDasharray="4 4"
            strokeWidth="0.8"
          />
          <line
            x1={paddingX}
            y1={height - paddingY}
            x2={width - paddingX}
            y2={height - paddingY}
            stroke="#334155"
            strokeDasharray="4 4"
            strokeWidth="0.8"
          />

          {/* Area fill */}
          {areaD && <path d={areaD} fill="url(#balanceGradient)" />}

          {/* Line path */}
          {pathD && (
            <path
              d={pathD}
              fill="none"
              stroke="#818cf8"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Data Points */}
          {points.map((p, idx) => (
            <circle
              key={idx}
              cx={p.x}
              cy={p.y}
              r={hoveredPoint?.id === p.tx.id ? 6 : 3}
              fill={hoveredPoint?.id === p.tx.id ? '#ffffff' : '#6366f1'}
              stroke="#4338ca"
              strokeWidth="2"
              className="cursor-pointer transition-all duration-150"
              onMouseEnter={() => setHoveredPoint(p.tx)}
              onMouseLeave={() => setHoveredPoint(null)}
            />
          ))}
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoveredPoint && (
          <div className="absolute top-3 right-4 bg-slate-900 border border-indigo-500/40 rounded-xl p-2.5 text-xs shadow-xl backdrop-blur-md pointer-events-none animate-fadeIn">
            <div className="font-semibold text-slate-100 flex items-center justify-between gap-3">
              <span>{hoveredPoint.transactionDate}</span>
              <span className="text-[11px] font-mono text-indigo-300">หน้า {hoveredPoint.pageNumber}</span>
            </div>
            <div className="text-slate-300 truncate max-w-[200px] mt-0.5">{hoveredPoint.description}</div>
            <div className="mt-1 pt-1 border-t border-slate-800 flex items-center justify-between gap-4 font-mono">
              <span className="text-slate-400">ยอดคงเหลือ:</span>
              <span className="font-bold text-indigo-300">{formatCurrency(hoveredPoint.balance, currency)}</span>
            </div>
            {hoveredPoint.deposit > 0 && (
              <div className="text-emerald-400 text-[11px] font-mono">+{formatCurrency(hoveredPoint.deposit, currency)}</div>
            )}
            {hoveredPoint.withdrawal > 0 && (
              <div className="text-rose-400 text-[11px] font-mono">-{formatCurrency(hoveredPoint.withdrawal, currency)}</div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-500 px-2 mt-2">
        <span>เริ่มต้น: {transactions[0]?.transactionDate || '-'}</span>
        <span>ยอดต่ำสุด: {formatCurrency(minBalance, '')}</span>
        <span>ยอดสูงสุด: {formatCurrency(maxBalance, '')}</span>
        <span>สิ้นสุด: {transactions[transactions.length - 1]?.transactionDate || '-'}</span>
      </div>
    </div>
  );
};
