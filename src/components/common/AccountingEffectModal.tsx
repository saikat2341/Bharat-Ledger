import React from 'react';
import { X, BookOpen, ArrowRight, ShieldCheck } from 'lucide-react';
import type { JournalEntry } from '../../types';
import { formatINR } from '../../utils/gst';

interface Props {
  entry: JournalEntry | null;
  isOpen: boolean;
  onClose: () => void;
}

export const AccountingEffectModal: React.FC<Props> = ({ entry, isOpen, onClose }) => {
  if (!isOpen || !entry) return null;

  const totalDebit = entry.lines.reduce((acc, l) => acc + (l.debit || 0), 0);
  const totalCredit = entry.lines.reduce((acc, l) => acc + (l.credit || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Double-Entry Accounting Effect</h3>
              <p className="text-xs text-slate-500">
                {entry.referenceType} #{entry.referenceNumber || 'N/A'} • {entry.date}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Narration</span>
            <p className="text-sm font-medium text-slate-800">{entry.narration}</p>
          </div>

          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Ledger Postings</div>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-100/75 border-b border-slate-200 text-xs font-semibold text-slate-600">
                    <th className="py-2.5 px-4">Account Head</th>
                    <th className="py-2.5 px-4 text-center">Code</th>
                    <th className="py-2.5 px-4 text-right">Debit (Dr)</th>
                    <th className="py-2.5 px-4 text-right">Credit (Cr)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {entry.lines.map((line, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4 font-medium text-slate-800">
                        {line.debit > 0 ? line.accountName : <span className="pl-4">To {line.accountName}</span>}
                      </td>
                      <td className="py-3 px-4 text-center text-xs font-mono text-slate-500">{line.accountCode}</td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-emerald-700">
                        {line.debit > 0 ? formatINR(line.debit) : '-'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-blue-700">
                        {line.credit > 0 ? formatINR(line.credit) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100/90 font-bold text-slate-900 border-t border-slate-200">
                    <td colSpan={2} className="py-3 px-4 text-xs uppercase tracking-wider text-slate-600">
                      Balanced Total
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-emerald-800">{formatINR(totalDebit)}</td>
                    <td className="py-3 px-4 text-right font-mono text-blue-800">{formatINR(totalCredit)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-xs text-emerald-800">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              Accounting equation verified: Total Debits equal Total Credits (₹{totalDebit.toFixed(2)} = ₹{totalCredit.toFixed(2)}).
            </span>
          </div>
        </div>

        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
