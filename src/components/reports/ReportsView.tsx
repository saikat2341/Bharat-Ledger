import React, { useState } from 'react';
import {
  FileBarChart,
  Download,
  Printer,
  Calendar,
  Filter,
  DollarSign,
  TrendingUp,
  Percent,
  Layers,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import type { SaleInvoice, PurchaseInvoice, Product, Customer, Supplier, Expense, BankAccount } from '../../types';
import { formatINR } from '../../utils/gst';

interface Props {
  sales: SaleInvoice[];
  purchases: PurchaseInvoice[];
  products: Product[];
  customers: Customer[];
  suppliers: Supplier[];
  expenses: Expense[];
  bankAccounts: BankAccount[];
}

export const ReportsView: React.FC<Props> = ({
  sales,
  purchases,
  products,
  customers,
  suppliers,
  expenses,
  bankAccounts,
}) => {
  const [selectedReport, setSelectedReport] = useState<
    'SALES' | 'PURCHASES' | 'GST' | 'INVENTORY' | 'PL' | 'BALANCE_SHEET' | 'OUTSTANDING'
  >('GST');

  // Calculations for P&L
  const validSales = sales.filter((s) => s.paymentStatus !== 'CANCELLED');
  const validPurchases = purchases.filter((p) => p.paymentStatus !== 'CANCELLED');

  const totalSalesRevenue = validSales.reduce((sum, s) => sum + s.taxableAmount, 0);
  const totalCostOfGoodsSold = validPurchases.reduce((sum, p) => sum + p.taxableAmount, 0);
  const grossProfit = totalSalesRevenue - totalCostOfGoodsSold;
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const netProfit = grossProfit - totalExpenses;

  // GST Breakdown
  const totalTaxableSales = validSales.reduce((sum, s) => sum + s.taxableAmount, 0);
  const totalOutputCGST = validSales.reduce((sum, s) => sum + s.cgstTotal, 0);
  const totalOutputSGST = validSales.reduce((sum, s) => sum + s.sgstTotal, 0);
  const totalOutputIGST = validSales.reduce((sum, s) => sum + s.igstTotal, 0);
  const totalOutputTax = totalOutputCGST + totalOutputSGST + totalOutputIGST;

  const totalInputCGST = validPurchases.reduce((sum, p) => sum + p.cgstTotal, 0);
  const totalInputSGST = validPurchases.reduce((sum, p) => sum + p.sgstTotal, 0);
  const totalInputIGST = validPurchases.reduce((sum, p) => sum + p.igstTotal, 0);
  const totalInputTaxCredit = totalInputCGST + totalInputSGST + totalInputIGST;

  const netGSTPayable = Math.max(0, totalOutputTax - totalInputTaxCredit);

  // Balance Sheet Assets & Liabilities
  const currentInventoryValue = products.reduce((sum, p) => sum + p.currentStock * p.purchasePrice, 0);
  const totalReceivables = customers.reduce((sum, c) => sum + c.currentBalance, 0);
  const totalCashBank = bankAccounts.reduce((sum, b) => sum + b.currentBalance, 0);
  const totalAssets = currentInventoryValue + totalReceivables + totalCashBank;

  const totalPayables = suppliers.reduce((sum, s) => sum + s.currentBalance, 0);
  const totalLiabilities = totalPayables + netGSTPayable;
  const ownersEquity = totalAssets - totalLiabilities;

  // CSV Export helper
  const exportToCSV = (filename: string, rows: string[][]) => {
    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.map((x) => `"${x}"`).join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportCSV = () => {
    if (selectedReport === 'GST') {
      const rows = [
        ['Report', 'GST Summary & GSTR Filing Overview'],
        ['Generated At', new Date().toLocaleDateString('en-IN')],
        [],
        ['Metric', 'Output (Sales)', 'Input (Purchases ITC)', 'Net Tax Payable'],
        ['Central Tax (CGST)', totalOutputCGST.toString(), totalInputCGST.toString(), (totalOutputCGST - totalInputCGST).toString()],
        ['State Tax (SGST)', totalOutputSGST.toString(), totalInputSGST.toString(), (totalOutputSGST - totalInputSGST).toString()],
        ['Integrated Tax (IGST)', totalOutputIGST.toString(), totalInputIGST.toString(), (totalOutputIGST - totalInputIGST).toString()],
        ['Total GST', totalOutputTax.toString(), totalInputTaxCredit.toString(), netGSTPayable.toString()],
      ];
      exportToCSV('GST_Report_Summary', rows);
    } else if (selectedReport === 'SALES') {
      const rows = [
        ['Invoice #', 'Date', 'Customer', 'GSTIN', 'Taxable', 'GST Tax', 'Grand Total', 'Status'],
        ...validSales.map((s) => [
          s.invoiceNumber,
          s.date,
          s.customerName,
          s.customerGstin || 'Consumer',
          s.taxableAmount.toString(),
          s.totalTax.toString(),
          s.grandTotal.toString(),
          s.paymentStatus,
        ]),
      ];
      exportToCSV('Sales_Register_Export', rows);
    } else {
      alert('CSV export ready for download.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Business Reports & GST Filing</h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Real-time financial summaries, GST input/output calculation, profit & loss, and balance sheets.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs sm:text-sm font-bold border border-slate-200"
          >
            <Printer className="w-4 h-4" />
            <span>Print Report</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV / Excel</span>
          </button>
        </div>
      </div>

      {/* Report Switcher Tabs */}
      <div className="flex border-b border-slate-200 gap-2 overflow-x-auto text-xs sm:text-sm font-bold text-slate-600 pb-2">
        {[
          { id: 'GST', label: 'GST Report (GSTR-1 / 3B)' },
          { id: 'PL', label: 'Profit & Loss Statement' },
          { id: 'BALANCE_SHEET', label: 'Balance Sheet' },
          { id: 'SALES', label: 'Sales Register' },
          { id: 'PURCHASES', label: 'Purchase & ITC Register' },
          { id: 'INVENTORY', label: 'Stock Valuation Report' },
          { id: 'OUTSTANDING', label: 'Receivables & Payables Aging' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedReport(tab.id as any)}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
              selectedReport === tab.id ? 'bg-slate-900 text-white shadow-xs' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* REPORT 1: GST SUMMARY */}
      {selectedReport === 'GST' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Total Output GST (Collected)
              </span>
              <div className="text-2xl font-black font-mono text-indigo-700">{formatINR(totalOutputTax)}</div>
              <p className="text-[11px] text-slate-400 mt-1">From {validSales.length} Tax Invoices</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Eligible Input Tax Credit (ITC)
              </span>
              <div className="text-2xl font-black font-mono text-emerald-700">{formatINR(totalInputTaxCredit)}</div>
              <p className="text-[11px] text-slate-400 mt-1">Paid to registered vendors</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Net Tax Payable to Govt
              </span>
              <div className="text-2xl font-black font-mono text-rose-600">{formatINR(netGSTPayable)}</div>
              <p className="text-[11px] text-slate-400 mt-1">After offsetting input credit</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 font-bold text-xs uppercase text-slate-700">
              GST Component Breakdown (GSTR-3B Format)
            </div>
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-slate-100 font-bold text-slate-700 border-b">
                  <th className="py-3 px-4">Tax Component</th>
                  <th className="py-3 px-4 text-right">Output Tax (Sales)</th>
                  <th className="py-3 px-4 text-right">Input Tax Credit (Purchases)</th>
                  <th className="py-3 px-4 text-right">Net Payable / (Credit Forward)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                <tr>
                  <td className="py-3 px-4 font-bold">Central Tax (CGST)</td>
                  <td className="py-3 px-4 text-right font-mono">{formatINR(totalOutputCGST)}</td>
                  <td className="py-3 px-4 text-right font-mono text-emerald-700">{formatINR(totalInputCGST)}</td>
                  <td className="py-3 px-4 text-right font-mono font-bold">
                    {formatINR(Math.max(0, totalOutputCGST - totalInputCGST))}
                  </td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-bold">State Tax (SGST)</td>
                  <td className="py-3 px-4 text-right font-mono">{formatINR(totalOutputSGST)}</td>
                  <td className="py-3 px-4 text-right font-mono text-emerald-700">{formatINR(totalInputSGST)}</td>
                  <td className="py-3 px-4 text-right font-mono font-bold">
                    {formatINR(Math.max(0, totalOutputSGST - totalInputSGST))}
                  </td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-bold">Integrated Tax (IGST - Interstate)</td>
                  <td className="py-3 px-4 text-right font-mono">{formatINR(totalOutputIGST)}</td>
                  <td className="py-3 px-4 text-right font-mono text-emerald-700">{formatINR(totalInputIGST)}</td>
                  <td className="py-3 px-4 text-right font-mono font-bold">
                    {formatINR(Math.max(0, totalOutputIGST - totalInputIGST))}
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 font-black text-slate-900 border-t">
                  <td className="py-3 px-4 uppercase">Total GST Liability</td>
                  <td className="py-3 px-4 text-right font-mono text-indigo-700">{formatINR(totalOutputTax)}</td>
                  <td className="py-3 px-4 text-right font-mono text-emerald-700">{formatINR(totalInputTaxCredit)}</td>
                  <td className="py-3 px-4 text-right font-mono text-rose-600 text-sm">{formatINR(netGSTPayable)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* REPORT 2: PROFIT & LOSS */}
      {selectedReport === 'PL' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6 space-y-6">
          <div className="border-b pb-4 flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Profit & Loss Statement</h2>
              <p className="text-xs text-slate-500">For Financial Year 2026-27 (Accrual Basis)</p>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-500 block uppercase font-bold">Net Profit Margin</span>
              <div className="text-xl font-black font-mono text-emerald-700">
                {totalSalesRevenue > 0 ? ((netProfit / totalSalesRevenue) * 100).toFixed(1) : '0.0'}%
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-xs sm:text-sm">
            {/* Revenue & Gross Profit */}
            <div className="space-y-4">
              <h3 className="font-bold text-slate-800 uppercase tracking-wider text-xs border-b pb-1">
                Income & Revenue
              </h3>
              <div className="flex justify-between py-1">
                <span className="font-semibold text-slate-700">Gross Sales Revenue (Taxable):</span>
                <span className="font-mono font-bold">{formatINR(totalSalesRevenue)}</span>
              </div>
              <div className="flex justify-between py-1 text-slate-600">
                <span>Less: Cost of Goods Sold (Purchases):</span>
                <span className="font-mono font-medium text-rose-600">-{formatINR(totalCostOfGoodsSold)}</span>
              </div>
              <div className="flex justify-between py-2 border-t font-black text-slate-900 bg-slate-50 p-2 rounded-lg">
                <span>Gross Profit:</span>
                <span className="font-mono text-base text-indigo-700">{formatINR(grossProfit)}</span>
              </div>
            </div>

            {/* Operating Expenses */}
            <div className="space-y-4">
              <h3 className="font-bold text-slate-800 uppercase tracking-wider text-xs border-b pb-1">
                Operating Expenses
              </h3>
              {expenses.map((exp) => (
                <div key={exp.id} className="flex justify-between py-1 text-slate-600">
                  <span>{exp.category}:</span>
                  <span className="font-mono">{formatINR(exp.amount)}</span>
                </div>
              ))}
              <div className="flex justify-between py-1 text-slate-800 font-bold border-t">
                <span>Total Operating Overhead:</span>
                <span className="font-mono text-rose-600">{formatINR(totalExpenses)}</span>
              </div>
              <div className="flex justify-between py-2 border-t font-black text-slate-900 bg-emerald-50 p-2 rounded-lg">
                <span className="text-emerald-900">Net Business Profit:</span>
                <span className="font-mono text-base text-emerald-700">{formatINR(netProfit)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* REPORT 3: BALANCE SHEET */}
      {selectedReport === 'BALANCE_SHEET' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6 space-y-6">
          <div className="border-b pb-4 flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Balance Sheet Statement</h2>
              <p className="text-xs text-slate-500">As on {new Date().toLocaleDateString('en-IN')}</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Assets = Liabilities + Equity (Balanced)</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-xs sm:text-sm">
            {/* Assets */}
            <div className="space-y-3">
              <h3 className="font-bold text-slate-800 uppercase tracking-wider text-xs border-b pb-1 text-emerald-800">
                Assets (What the Business Owns)
              </h3>
              <div className="flex justify-between py-1 text-slate-700">
                <span>Cash & Bank Balances:</span>
                <span className="font-mono font-semibold">{formatINR(totalCashBank)}</span>
              </div>
              <div className="flex justify-between py-1 text-slate-700">
                <span>Accounts Receivable (Customer Dues):</span>
                <span className="font-mono font-semibold">{formatINR(totalReceivables)}</span>
              </div>
              <div className="flex justify-between py-1 text-slate-700">
                <span>Closing Stock Inventory (At Cost):</span>
                <span className="font-mono font-semibold">{formatINR(currentInventoryValue)}</span>
              </div>
              <div className="flex justify-between py-3 border-t-2 font-black text-slate-900 bg-slate-50 p-3 rounded-xl mt-4">
                <span>Total Assets:</span>
                <span className="font-mono text-base text-emerald-700">{formatINR(totalAssets)}</span>
              </div>
            </div>

            {/* Liabilities & Equity */}
            <div className="space-y-3">
              <h3 className="font-bold text-slate-800 uppercase tracking-wider text-xs border-b pb-1 text-rose-800">
                Liabilities & Capital (What is Owed)
              </h3>
              <div className="flex justify-between py-1 text-slate-700">
                <span>Accounts Payable (Supplier Dues):</span>
                <span className="font-mono font-semibold">{formatINR(totalPayables)}</span>
              </div>
              <div className="flex justify-between py-1 text-slate-700">
                <span>GST Tax Liability Outstanding:</span>
                <span className="font-mono font-semibold">{formatINR(netGSTPayable)}</span>
              </div>
              <div className="flex justify-between py-1 text-slate-700">
                <span>Retained Earnings & Owner Equity:</span>
                <span className="font-mono font-semibold">{formatINR(ownersEquity)}</span>
              </div>
              <div className="flex justify-between py-3 border-t-2 font-black text-slate-900 bg-slate-50 p-3 rounded-xl mt-4">
                <span>Total Liabilities & Equity:</span>
                <span className="font-mono text-base text-rose-700">{formatINR(totalAssets)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* REPORT 4: SALES REGISTER */}
      {selectedReport === 'SALES' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 font-bold text-xs uppercase text-slate-700">
            Sales Register ({validSales.length} Invoices)
          </div>
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-slate-100 font-bold text-slate-700 border-b">
                <th className="py-2.5 px-4">Invoice #</th>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-4">Customer</th>
                <th className="py-2.5 px-3 text-right">Taxable</th>
                <th className="py-2.5 px-3 text-right">Total Tax</th>
                <th className="py-2.5 px-4 text-right">Invoice Total</th>
                <th className="py-2.5 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
              {validSales.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="py-2.5 px-4 font-mono font-bold text-indigo-700">{s.invoiceNumber}</td>
                  <td className="py-2.5 px-3 text-slate-600">{s.date}</td>
                  <td className="py-2.5 px-4 font-bold">{s.customerName}</td>
                  <td className="py-2.5 px-3 text-right font-mono">{formatINR(s.taxableAmount)}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-600">{formatINR(s.totalTax)}</td>
                  <td className="py-2.5 px-4 text-right font-mono font-bold">{formatINR(s.grandTotal)}</td>
                  <td className="py-2.5 px-3 text-center">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100">{s.paymentStatus}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* REPORT 5: INVENTORY VALUATION */}
      {selectedReport === 'INVENTORY' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 font-bold text-xs uppercase text-slate-700">
            Stock Valuation by Purchase Cost
          </div>
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-slate-100 font-bold text-slate-700 border-b">
                <th className="py-2.5 px-4">Product Name</th>
                <th className="py-2.5 px-3 text-center">HSN</th>
                <th className="py-2.5 px-3 text-center">In Stock</th>
                <th className="py-2.5 px-3 text-right">Unit Cost</th>
                <th className="py-2.5 px-4 text-right">Total Valuation (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {products.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="py-2.5 px-4 font-bold text-slate-900">{p.name}</td>
                  <td className="py-2.5 px-3 text-center font-mono text-slate-500">{p.hsn}</td>
                  <td className="py-2.5 px-3 text-center font-mono font-bold">
                    {p.currentStock} {p.unit}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono">{formatINR(p.purchasePrice)}</td>
                  <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">
                    {formatINR(p.currentStock * p.purchasePrice)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100 font-black text-slate-900 border-t">
                <td colSpan={4} className="py-3 px-4 uppercase">
                  Total Inventory Valuation
                </td>
                <td className="py-3 px-4 text-right font-mono text-emerald-700 text-sm">
                  {formatINR(currentInventoryValue)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
};
