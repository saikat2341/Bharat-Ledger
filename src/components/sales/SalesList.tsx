import React, { useState } from 'react';
import {
  Plus,
  Search,
  Filter,
  Printer,
  BookOpen,
  Ban,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  Calendar,
  ExternalLink,
} from 'lucide-react';
import type { SaleInvoice, CompanyProfile, Customer, Product, BankAccount, JournalEntry } from '../../types';
import { formatINR } from '../../utils/gst';
import { db, cancelSaleInvoice } from '../../db';

interface Props {
  sales: SaleInvoice[];
  company: CompanyProfile;
  customers: Customer[];
  products: Product[];
  bankAccounts: BankAccount[];
  journalEntries: JournalEntry[];
  onNewSaleClick: () => void;
  onPreviewInvoice: (invoice: SaleInvoice) => void;
  onViewAccounting: (entry: JournalEntry) => void;
  onRefresh: () => void;
}

export const SalesList: React.FC<Props> = ({
  sales,
  company,
  customers,
  products,
  bankAccounts,
  journalEntries,
  onNewSaleClick,
  onPreviewInvoice,
  onViewAccounting,
  onRefresh,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [cancelModalInvoice, setCancelModalInvoice] = useState<SaleInvoice | null>(null);
  const [cancelReason, setCancelReason] = useState('Customer cancelled order');
  const [isCancelling, setIsCancelling] = useState(false);

  // Filtering
  const filteredSales = sales.filter((s) => {
    const matchesSearch =
      s.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.customerGstin && s.customerGstin.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' || s.paymentStatus === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const totalSalesRevenue = sales
    .filter((s) => s.paymentStatus !== 'CANCELLED')
    .reduce((sum, s) => sum + s.grandTotal, 0);

  const totalOutstanding = sales
    .filter((s) => s.paymentStatus !== 'CANCELLED')
    .reduce((sum, s) => sum + s.balanceAmount, 0);

  const handleConfirmCancel = async () => {
    if (!cancelModalInvoice) return;
    try {
      setIsCancelling(true);
      await cancelSaleInvoice(cancelModalInvoice.id, cancelReason);
      setCancelModalInvoice(null);
      setCancelReason('');
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to cancel invoice');
    } finally {
      setIsCancelling(false);
    }
  };

  const findJournalForSale = (invoiceId: string) => {
    return journalEntries.find((je) => je.referenceId === invoiceId && je.referenceType === 'SALE');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner KPI */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Sales & Tax Invoices</h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Create, track and manage GST compliant invoices, customer balances, and instant printouts.
          </p>
        </div>
        <button
          onClick={onNewSaleClick}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-indigo-200 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>+ New Sale Invoice</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            Total Sales (FY {company.financialYear})
          </span>
          <div className="text-xl sm:text-2xl font-black font-mono text-slate-900">{formatINR(totalSalesRevenue)}</div>
          <p className="text-[11px] text-slate-400 mt-1">{sales.length} Invoices generated</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            Receivables Pending
          </span>
          <div className="text-xl sm:text-2xl font-black font-mono text-amber-600">{formatINR(totalOutstanding)}</div>
          <p className="text-[11px] text-slate-400 mt-1">Pending payments from customers</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            GST Collected (Output Tax)
          </span>
          <div className="text-xl sm:text-2xl font-black font-mono text-indigo-700">
            {formatINR(
              sales.filter((s) => s.paymentStatus !== 'CANCELLED').reduce((sum, s) => sum + s.totalTax, 0)
            )}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Payable to GST Portal</p>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search invoice number, customer or GSTIN..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
          {['ALL', 'PAID', 'PARTIAL', 'UNPAID', 'CANCELLED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl whitespace-nowrap transition-all cursor-pointer ${
                statusFilter === st
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st === 'ALL'
                ? 'All Status'
                : st === 'PAID'
                ? 'Paid'
                : st === 'PARTIAL'
                ? 'Partial'
                : st === 'UNPAID'
                ? 'Unpaid'
                : 'Cancelled'}
            </button>
          ))}
        </div>
      </div>

      {/* Sales Invoices Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {filteredSales.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <FileText className="w-12 h-12 text-slate-300 mx-auto" />
            <div className="text-base font-bold text-slate-700">No sales invoices found</div>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Create your first GST sales invoice to start billing customers and tracking inventory.
            </p>
            <button
              onClick={onNewSaleClick}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Sale</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-3 text-right">Taxable</th>
                  <th className="py-3 px-3 text-right">GST</th>
                  <th className="py-3 px-4 text-right">Grand Total</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3 text-right">Balance</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                {filteredSales.map((sale) => {
                  const journal = findJournalForSale(sale.id);
                  return (
                    <tr
                      key={sale.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        sale.paymentStatus === 'CANCELLED' ? 'opacity-60 bg-slate-50/40' : ''
                      }`}
                    >
                      {/* Invoice # */}
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-indigo-700">{sale.invoiceNumber}</span>
                        <div className="text-[10px] text-slate-400">
                          {sale.isInterstate ? 'Interstate (IGST)' : 'Intrastate'}
                        </div>
                      </td>

                      {/* Date */}
                      <td className="py-3 px-3 whitespace-nowrap text-xs text-slate-600">
                        {sale.date}
                        <div className="text-[10px] text-slate-400">Due: {sale.dueDate}</div>
                      </td>

                      {/* Customer */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{sale.customerName}</div>
                        <div className="text-[10px] font-mono text-slate-500">
                          {sale.customerGstin || 'Consumer (B2C)'}
                        </div>
                      </td>

                      {/* Taxable */}
                      <td className="py-3 px-3 text-right font-mono text-slate-600">
                        {formatINR(sale.taxableAmount)}
                      </td>

                      {/* GST */}
                      <td className="py-3 px-3 text-right font-mono text-slate-600">
                        {formatINR(sale.totalTax)}
                      </td>

                      {/* Grand Total */}
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        {formatINR(sale.grandTotal)}
                      </td>

                      {/* Payment Status */}
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold tracking-wide uppercase ${
                            sale.paymentStatus === 'PAID'
                              ? 'bg-emerald-100 text-emerald-800'
                              : sale.paymentStatus === 'PARTIAL'
                              ? 'bg-amber-100 text-amber-800'
                              : sale.paymentStatus === 'CANCELLED'
                              ? 'bg-red-100 text-red-800 line-through'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {sale.paymentStatus}
                        </span>
                      </td>

                      {/* Balance */}
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-700">
                        {sale.balanceAmount > 0 ? (
                          <span className="text-rose-600">{formatINR(sale.balanceAmount)}</span>
                        ) : (
                          <span className="text-slate-400">₹0.00</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => onPreviewInvoice(sale)}
                            className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 transition-colors"
                            title="Preview / Print GST Invoice"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          {journal && (
                            <button
                              onClick={() => onViewAccounting(journal)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                              title="View Double-Entry Accounting Effect"
                            >
                              <BookOpen className="w-4 h-4" />
                            </button>
                          )}

                          {sale.paymentStatus !== 'CANCELLED' && (
                            <button
                              onClick={() => setCancelModalInvoice(sale)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                              title="Cancel / Void Invoice"
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Cancel Confirmation Modal */}
      {cancelModalInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">Cancel Invoice #{cancelModalInvoice.invoiceNumber}?</h3>
                <p className="text-xs text-slate-500">Atomic accounting & stock reversal</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Cancelling this invoice will reverse all ledger entries, restore stock quantities to inventory, and adjust
              customer receivable balances.
            </p>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Cancellation Reason</label>
              <input
                type="text"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Reason for cancellation..."
                className="w-full text-xs rounded-xl border border-slate-300 p-2.5"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setCancelModalInvoice(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 hover:bg-slate-100"
              >
                No, Keep Invoice
              </button>
              <button
                disabled={isCancelling}
                onClick={handleConfirmCancel}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-xs"
              >
                {isCancelling ? 'Reversing...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
