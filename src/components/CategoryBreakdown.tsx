import React from 'react';
import { PieChart, Tag, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { Transaction } from '../types/statement';
import { formatCurrency } from '../utils/reconciliation';

interface Props {
  transactions: Transaction[];
  currency?: string;
}

export const CategoryBreakdown: React.FC<Props> = ({ transactions, currency = 'THB' }) => {
  // Aggregate expenses and income by category
  const categoryStats = React.useMemo(() => {
    const map = new Map<string, { deposits: number; withdrawals: number; count: number }>();

    transactions.forEach(t => {
      const cat = t.category || 'ทั่วไป (General)';
      const current = map.get(cat) || { deposits: 0, withdrawals: 0, count: 0 };
      current.deposits += t.deposit || 0;
      current.withdrawals += t.withdrawal || 0;
      current.count += 1;
      map.set(cat, current);
    });

    const list = Array.from(map.entries()).map(([name, data]) => ({
      name,
      ...data,
      totalVolume: data.deposits + data.withdrawals,
    }));

    // Sort by total volume descending
    list.sort((a, b) => b.totalVolume - a.totalVolume);
    return list;
  }, [transactions]);

  const grandVolume = categoryStats.reduce((sum, c) => sum + c.totalVolume, 0) || 1;

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl backdrop-blur-md">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="p-2 bg-purple-500/10 text-purple-400 rounded-lg">
          <PieChart className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-white">จำแนกรายการตามหมวดหมู่ (Category Classification)</h3>
          <p className="text-xs text-slate-400">สัดส่วนรายรับและรายจ่ายที่ AI ทำการจำแนกอัตโนมัติ</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {categoryStats.slice(0, 6).map((cat, i) => {
          const percent = ((cat.totalVolume / grandVolume) * 100).toFixed(1);
          return (
            <div key={i} className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs font-semibold text-slate-200">
                  <span className="truncate pr-2">{cat.name}</span>
                  <span className="text-[11px] text-slate-400 font-mono">{percent}%</span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div 
                    className="bg-indigo-500 h-full rounded-full transition-all duration-500" 
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono">
                {cat.deposits > 0 ? (
                  <span className="text-emerald-400 flex items-center gap-0.5">
                    <ArrowDownLeft className="w-3 h-3" />+{formatCurrency(cat.deposits, '')}
                  </span>
                ) : (
                  <span className="text-slate-600">-</span>
                )}
                {cat.withdrawals > 0 ? (
                  <span className="text-rose-400 flex items-center gap-0.5">
                    <ArrowUpRight className="w-3 h-3" />-{formatCurrency(cat.withdrawals, '')}
                  </span>
                ) : (
                  <span className="text-slate-600">-</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
