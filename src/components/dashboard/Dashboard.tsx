import React, { useState } from 'react';
import {
  TrendingUp,
  ArrowUpRight,
  ArrowDownLeft,
  DollarSign,
  AlertTriangle,
  Clock,
  Printer,
  Plus,
  ShoppingBag,
  Users,
  Package,
  Wallet,
  Building,
  CheckCircle2,
  Calendar,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import type {
  CompanyProfile,
  SaleInvoice,
  PurchaseInvoice,
  Customer,
  Supplier,
  Product,
  BankAccount,
} from '../../types';
import { formatINR } from '../../utils/gst';

interface Props {
  company: CompanyProfile;
  sales: SaleInvoice[];
  purchases: PurchaseInvoice[];
  customers: Customer[];
  suppliers: Supplier[];
  products: Product[];
  bankAccounts: BankAccount[];
  onNewSale: () => void;
  onNewPurchase: () => void;
  onReceiveMoney: () => void;
  onMakePayment: () => void;
  onAddCustomer: () => void;
  onAddProduct: () => void;
  onViewInventory: () => void;
  onPreviewInvoice: (invoice: SaleInvoice) => void;
  onNavigateTab: (tab: string) => void;
  onOpenSetup?: () => void;
}

export const Dashboard: React.FC<Props> = ({
  company,
  sales,
  purchases,
  customers,
  suppliers,
  products,
  bankAccounts,
  onNewSale,
  onNewPurchase,
  onReceiveMoney,
  onMakePayment,
  onAddCustomer,
  onAddProduct,
  onViewInventory,
  onPreviewInvoice,
  onNavigateTab,
  onOpenSetup,
}) => {
  const [salesTimeframe, setSalesTimeframe] = useState<'TODAY' | 'WEEK' | 'MONTH' | 'YEAR'>('MONTH');

  // Greeting logic
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

  const todayStr = new Date().toISOString().slice(0, 10);

  // Today calculations
  const todaySales = sales
    .filter((s) => s.date === todayStr && s.paymentStatus !== 'CANCELLED')
    .reduce((sum, s) => sum + s.grandTotal, 0);

  const todayPurchases = purchases
    .filter((p) => p.date === todayStr && p.paymentStatus !== 'CANCELLED')
    .reduce((sum, p) => sum + p.grandTotal, 0);

  const todayProfit = Math.max(0, todaySales - todayPurchases);

  // Outstanding balances
  const totalReceivables = customers.reduce((sum, c) => sum + c.currentBalance, 0);
  const totalPayables = suppliers.reduce((sum, s) => sum + s.currentBalance, 0);

  // Bank & Cash
  const cashAccount = bankAccounts.find((b) => b.id.includes('cash'));
  const primaryBank = bankAccounts.find((b) => b.isDefault) || bankAccounts[1] || bankAccounts[0];

  // Low Stock Items
  const lowStockItems = products.filter((p) => p.currentStock <= p.minStockAlert).slice(0, 5);

  // Recent Sales
  const recentSales = sales.slice(0, 5);

  // Customers with highest outstanding dues
  const topDebtors = customers
    .filter((c) => c.currentBalance > 0)
    .sort((a, b) => b.currentBalance - a.currentBalance)
    .slice(0, 5);

  // Real Dynamic Chart calculation based on timeframe and genuine records
  const chartDays = React.useMemo(() => {
    if (salesTimeframe === 'WEEK') {
      const days = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().slice(0, 10);
        const dayLabel = d.toLocaleDateString('en-IN', { weekday: 'short' });
        const dayTotal = sales
          .filter((s) => s.date === dateStr && s.paymentStatus !== 'CANCELLED')
          .reduce((sum, s) => sum + s.grandTotal, 0);
        days.push({ label: i === 0 ? 'Today' : dayLabel, value: dayTotal });
      }
      return days;
    }
    if (salesTimeframe === 'TODAY') {
      const buckets = [
        { label: 'Morning (6-12)', hours: [6, 12] },
        { label: 'Afternoon (12-16)', hours: [12, 16] },
        { label: 'Evening (16-20)', hours: [16, 20] },
        { label: 'Night (20-24)', hours: [20, 24] },
      ];
      return buckets.map((b) => {
        const total = sales
          .filter((s) => {
            if (s.date !== todayStr || s.paymentStatus === 'CANCELLED') return false;
            const h = new Date(s.createdAt).getHours();
            return h >= b.hours[0] && h < b.hours[1];
          })
          .reduce((sum, s) => sum + s.grandTotal, 0);
        return { label: b.label, value: total };
      });
    }
    if (salesTimeframe === 'MONTH') {
      const now = new Date();
      const currentYearMonth = now.toISOString().slice(0, 7);
      const monthlySales = sales.filter((s) => s.date.startsWith(currentYearMonth) && s.paymentStatus !== 'CANCELLED');
      const weeks = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
      return weeks.map((w, idx) => {
        const startDay = idx * 7 + 1;
        const endDay = idx === 3 ? 31 : (idx + 1) * 7;
        const total = monthlySales
          .filter((s) => {
            const dayNum = parseInt(s.date.split('-')[2] || '1', 10);
            return dayNum >= startDay && dayNum <= endDay;
          })
          .reduce((sum, s) => sum + s.grandTotal, 0);
        return { label: w, value: total };
      });
    }
    // YEAR: 12 financial year months
    const monthNames = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
    const currentYear = new Date().getFullYear();
    return monthNames.map((m, idx) => {
      const actualMonth = idx < 9 ? idx + 4 : idx - 8;
      const yr = idx < 9 ? currentYear : currentYear + 1;
      const monthPrefix = `${yr}-${String(actualMonth).padStart(2, '0')}`;
      const total = sales
        .filter((s) => s.date.startsWith(monthPrefix) && s.paymentStatus !== 'CANCELLED')
        .reduce((sum, s) => sum + s.grandTotal, 0);
      return { label: m, value: total };
    });
  }, [sales, salesTimeframe, todayStr]);

  const maxChartVal = Math.max(...chartDays.map((d) => d.value), 1000);

  return (
    <div className="space-y-6">
      {/* First-time Onboarding Alert if not configured */}
      {!company.isConfigured && (
        <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Welcome to BharatLedger!</h3>
              <p className="text-xs text-slate-600">
                Configure your business trade name, GSTIN, and bank account to start generating legal tax invoices.
              </p>
            </div>
          </div>
          <button
            onClick={() => (onOpenSetup ? onOpenSetup() : onNavigateTab('settings'))}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer whitespace-nowrap"
          >
            Launch Setup Wizard &rarr;
          </button>
        </div>
      )}

      {/* Top Banner Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 to-indigo-950 p-6 rounded-3xl text-white shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xl sm:text-2xl font-extrabold tracking-tight">
              {greeting} 👋 {company.businessName || 'Business Owner'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-300">
            GSTIN: <span className="font-mono text-indigo-300 font-semibold">{company.gstin || 'Not Configured'}</span> • Financial Year{' '}
            <span className="font-semibold text-white">{company.financialYear}</span> • Local Offline Storage Active
          </p>
        </div>

        <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/10 text-xs font-semibold">
          <Calendar className="w-4 h-4 text-indigo-300" />
          <span>{new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span>
        </div>
      </div>

      {/* Quick Action Bar (Primary actions large and prominent) */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-3">
          Quick Actions & Transactions
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5">
          <button
            onClick={onNewSale}
            className="flex flex-col items-center justify-center p-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all shadow-md shadow-indigo-100 group cursor-pointer"
          >
            <Plus className="w-5 h-5 mb-1 group-hover:scale-110 transition-transform" />
            <span className="text-xs">+ New Sale</span>
          </button>

          <button
            onClick={onNewPurchase}
            className="flex flex-col items-center justify-center p-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold transition-all shadow-md group cursor-pointer"
          >
            <ShoppingBag className="w-5 h-5 mb-1 group-hover:scale-110 transition-transform" />
            <span className="text-xs">+ Record Purchase</span>
          </button>

          <button
            onClick={onReceiveMoney}
            className="flex flex-col items-center justify-center p-3.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold transition-all group cursor-pointer"
          >
            <ArrowDownLeft className="w-5 h-5 mb-1 group-hover:scale-110 transition-transform text-emerald-600" />
            <span className="text-xs">Receive Money</span>
          </button>

          <button
            onClick={onMakePayment}
            className="flex flex-col items-center justify-center p-3.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 font-bold transition-all group cursor-pointer"
          >
            <ArrowUpRight className="w-5 h-5 mb-1 group-hover:scale-110 transition-transform text-rose-600" />
            <span className="text-xs">Pay Money</span>
          </button>

          <button
            onClick={onAddCustomer}
            className="flex flex-col items-center justify-center p-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 font-bold transition-all group cursor-pointer"
          >
            <Users className="w-5 h-5 mb-1 group-hover:scale-110 transition-transform text-slate-700" />
            <span className="text-xs">+ Add Customer</span>
          </button>

          <button
            onClick={onAddProduct}
            className="flex flex-col items-center justify-center p-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 font-bold transition-all group cursor-pointer"
          >
            <Package className="w-5 h-5 mb-1 group-hover:scale-110 transition-transform text-slate-700" />
            <span className="text-xs">+ Add Product</span>
          </button>
        </div>
      </div>

      {/* Top 6 KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        {/* Card 1: Today's Sales */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            Today's Sales
          </span>
          <div className="text-lg sm:text-xl font-black font-mono text-slate-900">{formatINR(todaySales)}</div>
          <div className="text-[10px] text-emerald-600 font-bold mt-1 flex items-center gap-0.5">
            <TrendingUp className="w-3 h-3" />
            <span>Active Billing</span>
          </div>
        </div>

        {/* Card 2: Today's Purchases */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            Today's Purchases
          </span>
          <div className="text-lg sm:text-xl font-black font-mono text-slate-900">{formatINR(todayPurchases)}</div>
          <div className="text-[10px] text-slate-400 mt-1">Vendor bills logged</div>
        </div>

        {/* Card 3: Receivables */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            Receivables (To Collect)
          </span>
          <div className="text-lg sm:text-xl font-black font-mono text-amber-600">{formatINR(totalReceivables)}</div>
          <div className="text-[10px] text-amber-700 font-semibold mt-1">
            {customers.filter((c) => c.currentBalance > 0).length} parties owe dues
          </div>
        </div>

        {/* Card 4: Payables */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            Payables (To Pay)
          </span>
          <div className="text-lg sm:text-xl font-black font-mono text-rose-600">{formatINR(totalPayables)}</div>
          <div className="text-[10px] text-rose-700 font-semibold mt-1">
            {suppliers.filter((s) => s.currentBalance > 0).length} suppliers pending
          </div>
        </div>

        {/* Card 5: Bank Balance */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            Bank Balance ({primaryBank?.bankName || 'Bank'})
          </span>
          <div className="text-lg sm:text-xl font-black font-mono text-indigo-700">
            {formatINR(primaryBank?.currentBalance || 0)}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">A/C: {primaryBank?.accountNumber || 'Primary'}</div>
        </div>

        {/* Card 6: Cash Balance */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            Cash Drawer
          </span>
          <div className="text-lg sm:text-xl font-black font-mono text-emerald-700">
            {formatINR(cashAccount?.currentBalance || 0)}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Physical counter cash</div>
        </div>
      </div>

      {/* Middle Section: Sales Overview Chart & Low Stock alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Overview Bar Visualization */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Sales Overview</h2>
              <p className="text-xs text-slate-500">Revenue velocity & invoice volume</p>
            </div>
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-600">
              {(['TODAY', 'WEEK', 'MONTH', 'YEAR'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setSalesTimeframe(t)}
                  className={`px-3 py-1 rounded-lg transition-colors ${
                    salesTimeframe === t ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
                  }`}
                >
                  {t === 'TODAY' ? 'Today' : t === 'WEEK' ? 'Week' : t === 'MONTH' ? 'Month' : 'Year'}
                </button>
              ))}
            </div>
          </div>

          {/* Bar Chart Presentation */}
          <div className="pt-4">
            <div className="h-44 flex items-end justify-between gap-3 px-2 border-b border-slate-100">
              {chartDays.map((d, idx) => {
                const heightPct = d.value > 0 ? Math.min(100, Math.max(10, (d.value / maxChartVal) * 100)) : 0;
                const isToday = idx === chartDays.length - 1;
                return (
                  <div key={d.label} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                    <div className="text-[10px] font-mono font-bold text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">
                      {d.value > 0 ? `₹${(d.value / 1000).toFixed(1)}k` : '₹0'}
                    </div>
                    <div
                      style={{ height: `${heightPct}%`, minHeight: d.value > 0 ? '6px' : '2px' }}
                      className={`w-full max-w-[42px] rounded-t-lg transition-all ${
                        d.value > 0
                          ? isToday
                            ? 'bg-indigo-600 shadow-sm'
                            : 'bg-indigo-200 hover:bg-indigo-300'
                          : 'bg-slate-100'
                      }`}
                    />
                    <span className={`text-[11px] font-bold ${isToday && d.value > 0 ? 'text-indigo-600' : 'text-slate-500'}`}>
                      {d.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 text-xs text-slate-500 border-t border-slate-100">
            <span>GST Taxable Sales: {formatINR(sales.reduce((sum, s) => sum + s.taxableAmount, 0))}</span>
            <span>Total Invoices Generated: {sales.length}</span>
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                <h2 className="text-base font-bold text-slate-900">Low Stock Alert</h2>
              </div>
              <button
                onClick={onViewInventory}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
              >
                <span>View Inventory</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {lowStockItems.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-400 space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                <p className="font-semibold text-slate-600">All products adequately stocked!</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {lowStockItems.map((p) => (
                  <div key={p.id} className="py-2.5 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-900 text-xs line-clamp-1">{p.name}</div>
                      <div className="text-[10px] text-slate-400">
                        Min stock threshold: {p.minStockAlert} {p.unit}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                          p.currentStock <= 0 ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {p.currentStock <= 0 ? 'Out of Stock' : `${p.currentStock} ${p.unit} Left`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 text-xs text-amber-800 flex items-center justify-between">
            <span>Reorder items to prevent stockout</span>
            <button
              onClick={onNewPurchase}
              className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold cursor-pointer"
            >
              Order Now
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Section: Recent Invoices & Top Outstanding Customers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Invoices */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/70">
            <h3 className="font-bold text-slate-900 text-sm">Recent Sales Invoices</h3>
            <button
              onClick={() => onNavigateTab('sales')}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
            >
              View All Sales &rarr;
            </button>
          </div>

          {recentSales.length === 0 ? (
            <div className="py-12 px-4 text-center">
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-800">No Sales Invoices Yet</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                Generate your first GST invoice with automated CGST/SGST/IGST tax calculation, stock reduction, and PDF generation.
              </p>
              <button
                onClick={onNewSale}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
              >
                + Create First Invoice (Ctrl+N)
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentSales.map((s) => (
                <div key={s.id} className="p-4 flex items-center justify-between hover:bg-slate-50/60">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center font-mono font-bold text-indigo-700 text-xs">
                      INV
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-2">
                        <span>{s.customerName}</span>
                        <span className="font-mono text-slate-400 text-xs">({s.invoiceNumber})</span>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {s.date} • {s.items.length} items • {s.isInterstate ? 'Interstate IGST' : 'Intrastate'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-right">
                    <div>
                      <div className="font-mono font-bold text-slate-900 text-xs sm:text-sm">
                        {formatINR(s.grandTotal)}
                      </div>
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          s.paymentStatus === 'PAID'
                            ? 'bg-emerald-100 text-emerald-800'
                            : s.paymentStatus === 'PARTIAL'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {s.paymentStatus}
                      </span>
                    </div>
                    <button
                      onClick={() => onPreviewInvoice(s)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 cursor-pointer"
                      title="Print / View Invoice"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Outstanding Customers */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col justify-between">
          <div>
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/70">
              <h3 className="font-bold text-slate-900 text-sm">Customer Receivables</h3>
              <button
                onClick={() => onNavigateTab('customers')}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
              >
                All Debtors &rarr;
              </button>
            </div>

            {topDebtors.length === 0 ? (
              <div className="py-12 px-4 text-center">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-800">Zero Unpaid Receivables</h4>
                <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1">
                  All customer accounts are fully settled, or no credit invoices have been booked yet.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {topDebtors.map((c) => (
                  <div key={c.id} className="p-4 flex items-center justify-between hover:bg-slate-50/60">
                    <div>
                      <div className="font-bold text-slate-900 text-xs">{c.name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{c.phone || c.city || 'Credit account'}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-bold text-rose-600 text-xs sm:text-sm">
                        {formatINR(c.currentBalance)}
                      </div>
                      <span className="text-[10px] text-slate-400">Due</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
            <span className="text-xs font-bold text-slate-700">Total Unpaid Balance:</span>
            <span className="font-mono font-black text-rose-600 text-sm">{formatINR(totalReceivables)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
