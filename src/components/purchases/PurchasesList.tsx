import React, { useState } from 'react';
import { Plus, Search, BookOpen, ShoppingBag, Truck } from 'lucide-react';
import type { PurchaseInvoice, Supplier, JournalEntry } from '../../types';
import { formatINR } from '../../utils/gst';

interface Props {
  purchases: PurchaseInvoice[];
  suppliers: Supplier[];
  journalEntries: JournalEntry[];
  onNewPurchaseClick: () => void;
  onViewAccounting: (entry: JournalEntry) => void;
}

export const PurchasesList: React.FC<Props> = ({
  purchases,
  suppliers,
  journalEntries,
  onNewPurchaseClick,
  onViewAccounting,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = purchases.filter(
    (p) =>
      p.purchaseNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.supplierInvoiceNumber && p.supplierInvoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalPurchases = purchases
    .filter((p) => p.paymentStatus !== 'CANCELLED')
    .reduce((sum, p) => sum + p.grandTotal, 0);

  const totalPayable = purchases
    .filter((p) => p.paymentStatus !== 'CANCELLED')
    .reduce((sum, p) => sum + p.balanceAmount, 0);

  const totalITC = purchases
    .filter((p) => p.paymentStatus !== 'CANCELLED')
    .reduce((sum, p) => sum + p.totalTax, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Purchases & Vendor Bills</h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Record raw material & merchandise purchases, track Input Tax Credit (ITC), and manage payables.
          </p>
        </div>
        <button
          onClick={onNewPurchaseClick}
          className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs sm:text-sm font-bold shadow transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>+ Record Purchase</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            Total Purchases
          </span>
          <div className="text-xl sm:text-2xl font-black font-mono text-slate-900">{formatINR(totalPurchases)}</div>
          <p className="text-[11px] text-slate-400 mt-1">{purchases.length} Vendor Bills</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            Total Payables to Vendors
          </span>
          <div className="text-xl sm:text-2xl font-black font-mono text-rose-600">{formatINR(totalPayable)}</div>
          <p className="text-[11px] text-slate-400 mt-1">Pending payments to suppliers</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            Input Tax Credit (ITC)
          </span>
          <div className="text-xl sm:text-2xl font-black font-mono text-emerald-700">{formatINR(totalITC)}</div>
          <p className="text-[11px] text-slate-400 mt-1">Available to offset output GST</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search bill number, vendor or bill ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto" />
            <div className="text-base font-bold text-slate-700">No purchase bills recorded</div>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Add your vendor invoices to automatically add stock to inventory and track Input Tax Credit.
            </p>
            <button
              onClick={onNewPurchaseClick}
              className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl"
            >
              + Record First Purchase
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase">
                  <th className="py-3 px-4">Purchase Ref #</th>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-4">Supplier</th>
                  <th className="py-3 px-3 text-right">Taxable</th>
                  <th className="py-3 px-3 text-right">ITC Tax</th>
                  <th className="py-3 px-4 text-right">Bill Total</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3 text-right">Balance Due</th>
                  <th className="py-3 px-4 text-center">Ledger</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                {filtered.map((pur) => {
                  const journal = journalEntries.find(
                    (j) => j.referenceId === pur.id && j.referenceType === 'PURCHASE'
                  );
                  return (
                    <tr key={pur.id} className="hover:bg-slate-50/80">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {pur.purchaseNumber}
                        {pur.supplierInvoiceNumber && (
                          <div className="text-[10px] text-slate-400 font-normal">
                            Bill: {pur.supplierInvoiceNumber}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-xs text-slate-600">{pur.date}</td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{pur.supplierName}</div>
                        <div className="text-[10px] font-mono text-slate-500">{pur.supplierGstin || 'Unregistered'}</div>
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-600">{formatINR(pur.taxableAmount)}</td>
                      <td className="py-3 px-3 text-right font-mono text-emerald-700">{formatINR(pur.totalTax)}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        {formatINR(pur.grandTotal)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                            pur.paymentStatus === 'PAID'
                              ? 'bg-emerald-100 text-emerald-800'
                              : pur.paymentStatus === 'PARTIAL'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {pur.paymentStatus}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-rose-600">
                        {pur.balanceAmount > 0 ? formatINR(pur.balanceAmount) : '₹0.00'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {journal && (
                          <button
                            onClick={() => onViewAccounting(journal)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                            title="View Double-Entry Effect"
                          >
                            <BookOpen className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
