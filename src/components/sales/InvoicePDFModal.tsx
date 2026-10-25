import React from 'react';
import { X, Printer, Download, CheckCircle2, ShieldCheck, QrCode } from 'lucide-react';
import type { SaleInvoice, CompanyProfile } from '../../types';
import { formatINR, numberToWordsINR } from '../../utils/gst';

interface Props {
  invoice: SaleInvoice | null;
  company: CompanyProfile | null;
  isOpen: boolean;
  onClose: () => void;
}

export const InvoicePDFModal: React.FC<Props> = ({ invoice, company, isOpen, onClose }) => {
  if (!isOpen || !invoice || !company) return null;

  const handlePrint = () => {
    window.print();
  };

  // Group items by HSN for HSN summary table
  const hsnMap = new Map<
    string,
    { hsn: string; taxable: number; gstRate: number; cgst: number; sgst: number; igst: number; totalTax: number }
  >();

  invoice.items.forEach((item) => {
    const key = `${item.hsn}-${item.gstRate}`;
    const curr = hsnMap.get(key) || {
      hsn: item.hsn || 'N/A',
      taxable: 0,
      gstRate: item.gstRate,
      cgst: 0,
      sgst: 0,
      igst: 0,
      totalTax: 0,
    };
    curr.taxable += item.taxableAmount;
    curr.cgst += item.cgstAmount;
    curr.sgst += item.sgstAmount;
    curr.igst += item.igstAmount;
    curr.totalTax += item.totalTax;
    hsnMap.set(key, curr);
  });

  const hsnSummaries = Array.from(hsnMap.values());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      {/* Container */}
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden my-auto">
        {/* Modal Controls Header (Hidden on Print) */}
        <div className="no-print flex items-center justify-between px-6 py-3.5 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900 text-sm sm:text-base">GST Tax Invoice Preview</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-semibold font-mono">
              {invoice.invoiceNumber}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-xs transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>Print Invoice</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
              title="Close (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Invoice Page Canvas */}
        <div className="overflow-y-auto p-4 sm:p-8 bg-slate-100/50 print-area flex justify-center">
          <div className="bg-white p-6 sm:p-10 border border-slate-300 shadow-sm w-full max-w-3xl text-slate-900 text-xs sm:text-sm leading-relaxed rounded-lg">
            {/* Top Badge: TAX INVOICE */}
            <div className="border-b-2 border-slate-900 pb-4 mb-4">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="space-y-1">
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 uppercase">
                    {company.businessName}
                  </h1>
                  {company.legalName && company.legalName !== company.businessName && (
                    <p className="text-xs text-slate-600 font-medium">{company.legalName}</p>
                  )}
                  <p className="text-xs text-slate-600 max-w-md">{company.address}</p>
                  <p className="text-xs text-slate-600">
                    {company.city}, {company.state} - {company.pinCode}
                  </p>
                  <div className="pt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                    <span className="font-semibold text-slate-800">
                      GSTIN: <span className="font-mono text-slate-900 font-bold">{company.gstin}</span>
                    </span>
                    <span className="font-semibold text-slate-800">
                      PAN: <span className="font-mono text-slate-900">{company.pan}</span>
                    </span>
                    <span className="text-slate-700">Phone: {company.phone}</span>
                  </div>
                </div>

                <div className="sm:text-right shrink-0">
                  <div className="inline-block bg-slate-900 text-white font-extrabold text-sm sm:text-base px-4 py-1 rounded tracking-wider uppercase mb-2">
                    TAX INVOICE
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="font-mono font-bold text-slate-900 text-sm">
                      Invoice No: {invoice.invoiceNumber}
                    </div>
                    <div>
                      Invoice Date: <span className="font-semibold">{invoice.date}</span>
                    </div>
                    <div>
                      Due Date: <span className="font-semibold">{invoice.dueDate}</span>
                    </div>
                    <div>
                      Place of Supply: <span className="font-semibold">{invoice.placeOfSupply}</span>
                    </div>
                    <div>
                      Reverse Charge: <span className="font-semibold">No</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bill To & Supply Details Box */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border border-slate-300 rounded-lg p-3.5 mb-5 bg-slate-50/50">
              <div>
                <span className="text-[11px] font-bold tracking-wider text-slate-500 uppercase block mb-1">
                  Billed To (Customer Details)
                </span>
                <p className="font-bold text-slate-900 text-sm">{invoice.customerName}</p>
                <p className="text-xs text-slate-600 mt-0.5">{invoice.customerAddress || 'Address not specified'}</p>
                <div className="mt-2 space-y-0.5 text-xs">
                  {invoice.customerGstin ? (
                    <p className="font-semibold text-slate-800">
                      GSTIN: <span className="font-mono font-bold">{invoice.customerGstin}</span>
                    </p>
                  ) : (
                    <p className="text-slate-500 italic">Unregistered Consumer (B2C)</p>
                  )}
                  <p className="text-slate-600">State: {invoice.customerState}</p>
                  {invoice.customerPhone && <p className="text-slate-600">Phone: {invoice.customerPhone}</p>}
                </div>
              </div>

              <div className="sm:border-l sm:border-slate-200 sm:pl-4">
                <span className="text-[11px] font-bold tracking-wider text-slate-500 uppercase block mb-1">
                  Tax Treatment
                </span>
                <div className="space-y-1 text-xs text-slate-700">
                  <p>
                    Transaction Type:{' '}
                    <span className="font-semibold">
                      {invoice.isInterstate ? 'Interstate (IGST)' : 'Intrastate (CGST + SGST)'}
                    </span>
                  </p>
                  <p>
                    Payment Status:{' '}
                    <span
                      className={`font-bold ${
                        invoice.paymentStatus === 'PAID'
                          ? 'text-emerald-700'
                          : invoice.paymentStatus === 'PARTIAL'
                          ? 'text-amber-700'
                          : 'text-red-700'
                      }`}
                    >
                      {invoice.paymentStatus}
                    </span>
                  </p>
                  <p>
                    Payment Mode: <span className="font-semibold">{invoice.paymentMode}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Item Table */}
            <div className="border border-slate-300 rounded-lg overflow-hidden mb-5">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-300 text-slate-700 font-bold">
                    <th className="py-2 px-2 text-center w-8">#</th>
                    <th className="py-2 px-3">Item Description</th>
                    <th className="py-2 px-2 text-center">HSN/SAC</th>
                    <th className="py-2 px-2 text-center">Qty</th>
                    <th className="py-2 px-2 text-right">Rate (₹)</th>
                    <th className="py-2 px-2 text-right">Taxable (₹)</th>
                    <th className="py-2 px-2 text-center">GST %</th>
                    <th className="py-2 px-2 text-right">Tax (₹)</th>
                    <th className="py-2 px-3 text-right">Total (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {invoice.items.map((it, idx) => (
                    <tr key={it.id || idx} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-2 text-center text-slate-500">{idx + 1}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">{it.productName}</td>
                      <td className="py-2.5 px-2 text-center font-mono text-slate-600">{it.hsn || '-'}</td>
                      <td className="py-2.5 px-2 text-center font-semibold">
                        {it.quantity} {it.unit}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono">{formatINR(it.rate).replace('₹', '')}</td>
                      <td className="py-2.5 px-2 text-right font-mono font-medium">
                        {formatINR(it.taxableAmount).replace('₹', '')}
                      </td>
                      <td className="py-2.5 px-2 text-center font-mono font-semibold text-slate-700">{it.gstRate}%</td>
                      <td className="py-2.5 px-2 text-right font-mono text-slate-700">
                        {formatINR(it.totalTax).replace('₹', '')}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                        {formatINR(it.totalAmount).replace('₹', '')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Calculations & Summary Section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
              {/* Left Column: HSN Summary & Bank Details */}
              <div className="space-y-4">
                {/* HSN Summary Table */}
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <div className="bg-slate-100 px-3 py-1.5 font-bold text-[11px] text-slate-700 uppercase">
                    HSN / Tax Breakdown
                  </div>
                  <table className="w-full text-[11px] border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold">
                        <th className="py-1 px-2 text-left">HSN</th>
                        <th className="py-1 px-2 text-right">Taxable</th>
                        {invoice.isInterstate ? (
                          <th className="py-1 px-2 text-right">IGST</th>
                        ) : (
                          <>
                            <th className="py-1 px-2 text-right">CGST</th>
                            <th className="py-1 px-2 text-right">SGST</th>
                          </>
                        )}
                        <th className="py-1 px-2 text-right">Total Tax</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {hsnSummaries.map((h, i) => (
                        <tr key={i}>
                          <td className="py-1 px-2 font-mono text-slate-700">{h.hsn}</td>
                          <td className="py-1 px-2 text-right font-mono">{formatINR(h.taxable).replace('₹', '')}</td>
                          {invoice.isInterstate ? (
                            <td className="py-1 px-2 text-right font-mono">{formatINR(h.igst).replace('₹', '')}</td>
                          ) : (
                            <>
                              <td className="py-1 px-2 text-right font-mono">{formatINR(h.cgst).replace('₹', '')}</td>
                              <td className="py-1 px-2 text-right font-mono">{formatINR(h.sgst).replace('₹', '')}</td>
                            </>
                          )}
                          <td className="py-1 px-2 text-right font-mono font-semibold">
                            {formatINR(h.totalTax).replace('₹', '')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Bank Details Box */}
                <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/50 text-xs">
                  <div className="font-bold text-slate-800 text-[11px] uppercase tracking-wider mb-1.5">
                    Bank Details for NEFT / RTGS
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-[11px]">
                    <span className="text-slate-500">Bank Name:</span>
                    <span className="font-semibold text-slate-800">{company.bankName}</span>
                    <span className="text-slate-500">Account No:</span>
                    <span className="font-mono font-bold text-slate-900">{company.accountNumber}</span>
                    <span className="text-slate-500">IFSC Code:</span>
                    <span className="font-mono font-bold text-slate-900">{company.ifsc}</span>
                    <span className="text-slate-500">Branch:</span>
                    <span className="text-slate-700">{company.branch}</span>
                    {company.upiId && (
                      <>
                        <span className="text-slate-500">UPI ID:</span>
                        <span className="font-mono font-semibold text-indigo-700">{company.upiId}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Invoice Totals & Balance */}
              <div className="space-y-2 text-xs">
                <div className="border border-slate-300 rounded-lg p-3.5 space-y-2 bg-slate-50/50">
                  <div className="flex justify-between text-slate-600">
                    <span>Taxable Amount:</span>
                    <span className="font-mono font-medium">{formatINR(invoice.taxableAmount)}</span>
                  </div>

                  {invoice.isInterstate ? (
                    <div className="flex justify-between text-slate-600">
                      <span>Integrated Tax (IGST):</span>
                      <span className="font-mono font-medium">{formatINR(invoice.igstTotal)}</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between text-slate-600">
                        <span>Central Tax (CGST):</span>
                        <span className="font-mono font-medium">{formatINR(invoice.cgstTotal)}</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>State Tax (SGST):</span>
                        <span className="font-mono font-medium">{formatINR(invoice.sgstTotal)}</span>
                      </div>
                    </>
                  )}

                  {invoice.roundOff !== 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>Round Off:</span>
                      <span className="font-mono">{invoice.roundOff > 0 ? `+${invoice.roundOff}` : invoice.roundOff}</span>
                    </div>
                  )}

                  <div className="border-t border-slate-300 pt-2 flex justify-between items-center text-sm font-black text-slate-900">
                    <span>Grand Total:</span>
                    <span className="font-mono text-base text-indigo-900">{formatINR(invoice.grandTotal)}</span>
                  </div>

                  <div className="border-t border-dashed border-slate-300 pt-2 space-y-1 text-xs">
                    <div className="flex justify-between text-emerald-700 font-semibold">
                      <span>Amount Received:</span>
                      <span className="font-mono">{formatINR(invoice.paidAmount)}</span>
                    </div>
                    <div className="flex justify-between text-red-700 font-bold">
                      <span>Balance Outstanding:</span>
                      <span className="font-mono">{formatINR(invoice.balanceAmount)}</span>
                    </div>
                  </div>
                </div>

                <div className="p-2.5 bg-slate-100 rounded-lg text-slate-700 text-xs">
                  <span className="font-bold block text-[11px] uppercase tracking-wider text-slate-500 mb-0.5">
                    Amount in Words
                  </span>
                  <p className="font-semibold italic text-slate-800">{numberToWordsINR(invoice.grandTotal)}</p>
                </div>
              </div>
            </div>

            {/* Terms and Signature Footer */}
            <div className="border-t-2 border-slate-300 pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="font-bold text-[11px] uppercase tracking-wider text-slate-500 block mb-1">
                  Terms & Conditions
                </span>
                <p className="whitespace-pre-line text-slate-600 text-[11px] leading-relaxed">
                  {company.termsAndConditions || '1. Goods once sold will not be taken back.\n2. Subject to local jurisdiction only.'}
                </p>
              </div>

              <div className="text-right flex flex-col justify-between items-end sm:pt-4">
                <p className="font-bold text-slate-900 text-xs">For {company.businessName}</p>
                <div className="h-12 w-32 border-b border-dashed border-slate-400 mt-6"></div>
                <p className="text-[11px] text-slate-500 mt-1">Authorized Signatory</p>
              </div>
            </div>

            <div className="text-center text-[10px] text-slate-400 mt-6 pt-2 border-t border-slate-100">
              This is a computer generated invoice powered by BharatLedger Offline-First GST Engine.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
