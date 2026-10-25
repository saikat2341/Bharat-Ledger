import React, { useState } from 'react';
import {
  Wallet,
  Building,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  BookOpen,
  Receipt,
  Layers,
  CheckCircle2,
  DollarSign,
  X,
  CreditCard,
  PieChart,
} from 'lucide-react';
import type { BankAccount, Expense, JournalEntry, PaymentRecord, Customer, Supplier } from '../../types';
import { formatINR, EXPENSE_CATEGORIES } from '../../utils/gst';
import { db, recordExpense, recordPayment } from '../../db';

interface Props {
  bankAccounts: BankAccount[];
  expenses: Expense[];
  journalEntries: JournalEntry[];
  payments: PaymentRecord[];
  customers: Customer[];
  suppliers: Supplier[];
  onRefresh: () => void;
  onViewAccounting: (entry: JournalEntry) => void;
}

export const AccountsView: React.FC<Props> = ({
  bankAccounts,
  expenses,
  journalEntries,
  payments,
  customers,
  suppliers,
  onRefresh,
  onViewAccounting,
}) => {
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'EXPENSES' | 'BANK_ACCOUNTS' | 'ADVANCED'>('OVERVIEW');
  const [advancedSubTab, setAdvancedSubTab] = useState<'JOURNAL' | 'TRIAL_BALANCE' | 'CHART_OF_ACCOUNTS'>('JOURNAL');

  // Modals
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [showReceiveMoneyModal, setShowReceiveMoneyModal] = useState(false);
  const [showMakePaymentModal, setShowMakePaymentModal] = useState(false);
  const [showAddBankModal, setShowAddBankModal] = useState(false);

  // Add Expense State
  const [expCategory, setExpCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [expAmount, setExpAmount] = useState<number>(0);
  const [expDate, setExpDate] = useState(new Date().toISOString().slice(0, 10));
  const [expMode, setExpMode] = useState<'BANK' | 'CASH' | 'UPI'>('BANK');
  const [expBankId, setExpBankId] = useState(bankAccounts[0]?.id || '');
  const [expRef, setExpRef] = useState('');
  const [expNotes, setExpNotes] = useState('');

  // Receive Money State
  const [recCustomerId, setRecCustomerId] = useState(customers[0]?.id || '');
  const [recAmount, setRecAmount] = useState<number>(0);
  const [recDate, setRecDate] = useState(new Date().toISOString().slice(0, 10));
  const [recMode, setRecMode] = useState<'BANK' | 'CASH' | 'UPI'>('BANK');
  const [recBankId, setRecBankId] = useState(bankAccounts[0]?.id || '');
  const [recRef, setRecRef] = useState('');

  // Make Payment State
  const [paySupplierId, setPaySupplierId] = useState(suppliers[0]?.id || '');
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payDate, setPayDate] = useState(new Date().toISOString().slice(0, 10));
  const [payMode, setPayMode] = useState<'BANK' | 'CASH' | 'UPI'>('BANK');
  const [payBankId, setPayBankId] = useState(bankAccounts[0]?.id || '');
  const [payRef, setPayRef] = useState('');

  // Add Bank State
  const [newBankName, setNewBankName] = useState('');
  const [newAccountName, setNewAccountName] = useState('Current Account');
  const [newAccountNumber, setNewAccountNumber] = useState('');
  const [newIfsc, setNewIfsc] = useState('');
  const [newUpi, setNewUpi] = useState('');
  const [newOpeningBal, setNewOpeningBal] = useState<number>(0);

  // Totals
  const totalCash = bankAccounts.filter((b) => b.id.includes('cash')).reduce((sum, b) => sum + b.currentBalance, 0);
  const totalBank = bankAccounts.filter((b) => !b.id.includes('cash')).reduce((sum, b) => sum + b.currentBalance, 0);
  const totalLiquid = totalCash + totalBank;

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalMoneyReceived = payments.filter((p) => p.type === 'RECEIVE').reduce((sum, p) => sum + p.amount, 0);
  const totalMoneyPaid = payments.filter((p) => p.type === 'PAY').reduce((sum, p) => sum + p.amount, 0);

  // Submit Expense
  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (expAmount <= 0) return;

    await recordExpense({
      id: `exp-${Date.now()}`,
      category: expCategory,
      amount: Number(expAmount),
      date: expDate,
      paymentMode: expMode,
      bankAccountId: expBankId,
      reference: expRef,
      notes: expNotes,
      createdAt: new Date().toISOString(),
    });

    setShowAddExpenseModal(false);
    setExpRef('');
    setExpNotes('');
    onRefresh();
  };

  // Submit Receive Money
  const handleReceiveMoney = async (e: React.FormEvent) => {
    e.preventDefault();
    const cust = customers.find((c) => c.id === recCustomerId);
    if (!cust || recAmount <= 0) return;

    await recordPayment({
      id: `pay-${Date.now()}`,
      type: 'RECEIVE',
      partyType: 'CUSTOMER',
      partyId: cust.id,
      partyName: cust.name,
      amount: Number(recAmount),
      date: recDate,
      paymentMode: recMode,
      bankAccountId: recBankId,
      referenceNo: recRef,
      notes: `Direct money received from ${cust.name}`,
      createdAt: new Date().toISOString(),
    });

    setShowReceiveMoneyModal(false);
    setRecRef('');
    onRefresh();
  };

  // Submit Make Payment
  const handleMakePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const sup = suppliers.find((s) => s.id === paySupplierId);
    if (!sup || payAmount <= 0) return;

    await recordPayment({
      id: `pay-${Date.now()}`,
      type: 'PAY',
      partyType: 'SUPPLIER',
      partyId: sup.id,
      partyName: sup.name,
      amount: Number(payAmount),
      date: payDate,
      paymentMode: payMode,
      bankAccountId: payBankId,
      referenceNo: payRef,
      notes: `Direct payment made to ${sup.name}`,
      createdAt: new Date().toISOString(),
    });

    setShowMakePaymentModal(false);
    setPayRef('');
    onRefresh();
  };

  // Submit Add Bank Account
  const handleSaveBankAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBankName.trim()) return;

    const newBank: BankAccount = {
      id: `bank-${Date.now()}`,
      bankName: newBankName.trim(),
      accountName: newAccountName.trim(),
      accountNumber: newAccountNumber.trim(),
      ifsc: newIfsc.trim().toUpperCase(),
      upiId: newUpi.trim(),
      openingBalance: Number(newOpeningBal) || 0,
      currentBalance: Number(newOpeningBal) || 0,
      isDefault: false,
      createdAt: new Date().toISOString(),
    };

    await db.bankAccounts.add(newBank);
    setShowAddBankModal(false);
    setNewBankName('');
    setNewAccountNumber('');
    setNewIfsc('');
    onRefresh();
  };

  // Trial Balance calculation from all journal lines
  const trialBalanceAccounts = new Map<string, { code: string; name: string; debit: number; credit: number }>();
  journalEntries.forEach((je) => {
    je.lines.forEach((l) => {
      const curr = trialBalanceAccounts.get(l.accountCode) || {
        code: l.accountCode,
        name: l.accountName,
        debit: 0,
        credit: 0,
      };
      curr.debit += l.debit || 0;
      curr.credit += l.credit || 0;
      trialBalanceAccounts.set(l.accountCode, curr);
    });
  });

  const trialRows = Array.from(trialBalanceAccounts.values());
  const trialTotalDebit = trialRows.reduce((sum, r) => sum + r.debit, 0);
  const trialTotalCredit = trialRows.reduce((sum, r) => sum + r.credit, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Accounts & Cash Flow</h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Cash books, bank balances, expense vouchers, and double-entry accounting engine underneath.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowReceiveMoneyModal(true)}
            className="flex items-center gap-1 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow transition-colors cursor-pointer"
          >
            <ArrowDownLeft className="w-4 h-4" />
            <span>+ Receive Money</span>
          </button>
          <button
            onClick={() => setShowMakePaymentModal(true)}
            className="flex items-center gap-1 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow transition-colors cursor-pointer"
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>+ Pay Money</span>
          </button>
          <button
            onClick={() => setShowAddExpenseModal(true)}
            className="flex items-center gap-1 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs sm:text-sm font-bold shadow transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Expense</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-6 text-sm font-bold text-slate-500 overflow-x-auto">
        {[
          { id: 'OVERVIEW', label: 'Cash & Bank Overview' },
          { id: 'EXPENSES', label: `Operating Expenses (${expenses.length})` },
          { id: 'BANK_ACCOUNTS', label: `Bank Accounts (${bankAccounts.length})` },
          { id: 'ADVANCED', label: 'Advanced Accounts (Double-Entry Engine)' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`pb-3 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: Overview */}
      {activeTab === 'OVERVIEW' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Total Liquid Funds
              </span>
              <div className="text-2xl font-black font-mono text-slate-900">{formatINR(totalLiquid)}</div>
              <div className="mt-2 text-xs text-slate-500 flex justify-between">
                <span>Bank: {formatINR(totalBank)}</span>
                <span>Cash: {formatINR(totalCash)}</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Money Inflows (Receipts)
              </span>
              <div className="text-2xl font-black font-mono text-emerald-700">{formatINR(totalMoneyReceived)}</div>
              <p className="text-[11px] text-slate-400 mt-2">Collected from customer balances</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Total Expenses Logged
              </span>
              <div className="text-2xl font-black font-mono text-rose-600">{formatINR(totalExpenses)}</div>
              <p className="text-[11px] text-slate-400 mt-2">Rent, utilities, salaries, and shipping</p>
            </div>
          </div>

          {/* Bank Accounts Grid */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Cash & Bank Accounts</h2>
              <button
                onClick={() => setShowAddBankModal(true)}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
              >
                + Add Bank Account
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {bankAccounts.map((b) => (
                <div
                  key={b.id}
                  className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs hover:border-indigo-300 transition-colors"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 font-bold">
                        {b.id.includes('cash') ? <Wallet className="w-5 h-5" /> : <Building className="w-5 h-5" />}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 text-sm">{b.bankName}</div>
                        <div className="text-[11px] text-slate-500">{b.accountName}</div>
                      </div>
                    </div>
                    {b.isDefault && (
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full">
                        Primary
                      </span>
                    )}
                  </div>

                  <div className="text-xl font-black font-mono text-slate-900 mb-2">
                    {formatINR(b.currentBalance)}
                  </div>

                  <div className="text-xs text-slate-500 space-y-0.5 pt-2 border-t border-slate-100 font-mono">
                    <div>A/C: {b.accountNumber}</div>
                    {b.ifsc !== 'NA' && <div>IFSC: {b.ifsc}</div>}
                    {b.upiId && <div className="text-indigo-600 font-sans">UPI: {b.upiId}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Money In/Out History */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/70 font-bold text-xs uppercase text-slate-600">
              Recent Cash & Bank Activity
            </div>
            <div className="divide-y divide-slate-100">
              {payments.slice(0, 8).map((p) => (
                <div key={p.id} className="p-4 flex items-center justify-between hover:bg-slate-50/50">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold ${
                        p.type === 'RECEIVE'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-rose-50 text-rose-700'
                      }`}
                    >
                      {p.type === 'RECEIVE' ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className="text-xs sm:text-sm font-bold text-slate-900">
                        {p.type === 'RECEIVE' ? `Received from ${p.partyName}` : `Paid to ${p.partyName}`}
                      </div>
                      <div className="text-xs text-slate-400">
                        {p.date} • Mode: {p.paymentMode} {p.referenceNo ? `• Ref: ${p.referenceNo}` : ''}
                      </div>
                    </div>
                  </div>
                  <div
                    className={`text-sm sm:text-base font-black font-mono ${
                      p.type === 'RECEIVE' ? 'text-emerald-700' : 'text-rose-700'
                    }`}
                  >
                    {p.type === 'RECEIVE' ? `+${formatINR(p.amount)}` : `-${formatINR(p.amount)}`}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab: Expenses */}
      {activeTab === 'EXPENSES' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-slate-700 uppercase">Operating Expense Vouchers</span>
            <button
              onClick={() => setShowAddExpenseModal(true)}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold"
            >
              + Add Expense Voucher
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-slate-50 border-b font-bold text-slate-700 uppercase">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Expense Category</th>
                  <th className="py-3 px-4">Mode / Account</th>
                  <th className="py-3 px-4">Reference / Remarks</th>
                  <th className="py-3 px-4 text-right">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                {expenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 font-mono text-slate-600">{exp.date}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{exp.category}</td>
                    <td className="py-3 px-4 text-slate-600">{exp.paymentMode}</td>
                    <td className="py-3 px-4 text-slate-600">{exp.notes || exp.reference || '-'}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-rose-600">
                      {formatINR(exp.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Bank Accounts */}
      {activeTab === 'BANK_ACCOUNTS' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-slate-700 uppercase">Configured Bank Accounts</span>
            <button
              onClick={() => setShowAddBankModal(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold"
            >
              + Add Bank Account
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {bankAccounts.map((b) => (
              <div key={b.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">{b.bankName}</h3>
                    <p className="text-xs text-slate-500">{b.accountName}</p>
                  </div>
                  <span className="text-xs font-bold font-mono px-3 py-1 bg-slate-100 rounded-lg">
                    {b.accountNumber}
                  </span>
                </div>
                <div className="text-2xl font-black font-mono text-slate-900">{formatINR(b.currentBalance)}</div>
                <div className="text-xs text-slate-500 pt-2 border-t flex justify-between">
                  <span>IFSC: {b.ifsc}</span>
                  {b.upiId && <span className="text-indigo-600 font-semibold">UPI: {b.upiId}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Advanced Double-Entry Accounting */}
      {activeTab === 'ADVANCED' && (
        <div className="space-y-5">
          <div className="flex gap-2 border-b pb-3">
            {[
              { id: 'JOURNAL', label: 'Journal Entries Audit Log' },
              { id: 'TRIAL_BALANCE', label: 'Trial Balance' },
              { id: 'CHART_OF_ACCOUNTS', label: 'Chart of Accounts' },
            ].map((sub) => (
              <button
                key={sub.id}
                onClick={() => setAdvancedSubTab(sub.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                  advancedSubTab === sub.id ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
                }`}
              >
                {sub.label}
              </button>
            ))}
          </div>

          {/* Subtab 1: Journal Entries */}
          {advancedSubTab === 'JOURNAL' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
              <div className="px-5 py-3 bg-slate-50 border-b flex justify-between items-center text-xs font-bold text-slate-700 uppercase">
                <span>General Journal Entries ({journalEntries.length})</span>
                <span className="text-[11px] font-normal text-slate-500">
                  Automatic double-entry bookkeeping engine
                </span>
              </div>
              <div className="divide-y divide-slate-100">
                {journalEntries.map((je) => (
                  <div key={je.id} className="p-4 space-y-2 hover:bg-slate-50/50">
                    <div className="flex justify-between items-center text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-indigo-700">{je.referenceNumber || je.id}</span>
                        <span className="text-slate-400">•</span>
                        <span className="text-slate-500">{je.date}</span>
                        <span className="text-slate-400">•</span>
                        <span className="font-semibold text-slate-700">{je.narration}</span>
                      </div>
                      <button
                        onClick={() => onViewAccounting(je)}
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
                      >
                        Inspect Vouchers &rarr;
                      </button>
                    </div>

                    <div className="pl-4 border-l-2 border-slate-200 space-y-1 text-xs">
                      {je.lines.map((l, idx) => (
                        <div key={idx} className="flex justify-between max-w-xl text-slate-600 font-mono">
                          <span className={l.debit > 0 ? 'font-semibold text-slate-800' : 'pl-4'}>
                            {l.debit > 0 ? l.accountName : `To ${l.accountName}`}
                          </span>
                          <span className="space-x-4">
                            <span className="text-emerald-700">{l.debit > 0 ? formatINR(l.debit) : ''}</span>
                            <span className="text-blue-700">{l.credit > 0 ? formatINR(l.credit) : ''}</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Subtab 2: Trial Balance */}
          {advancedSubTab === 'TRIAL_BALANCE' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
              <div className="p-4 bg-slate-50 border-b flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Trial Balance Statement</h3>
                  <p className="text-xs text-slate-500">Verification that total Debits equal total Credits</p>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Balanced</span>
                </div>
              </div>

              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-slate-100 border-b font-bold text-slate-700 uppercase">
                    <th className="py-2.5 px-4">Account Code</th>
                    <th className="py-2.5 px-4">Account Title</th>
                    <th className="py-2.5 px-4 text-right">Debit Total (₹)</th>
                    <th className="py-2.5 px-4 text-right">Credit Total (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {trialRows.map((tr) => (
                    <tr key={tr.code} className="hover:bg-slate-50">
                      <td className="py-2 px-4 font-mono text-slate-500">{tr.code}</td>
                      <td className="py-2 px-4 font-semibold text-slate-800">{tr.name}</td>
                      <td className="py-2 px-4 text-right font-mono font-semibold text-emerald-700">
                        {tr.debit > 0 ? formatINR(tr.debit) : '-'}
                      </td>
                      <td className="py-2 px-4 text-right font-mono font-semibold text-blue-700">
                        {tr.credit > 0 ? formatINR(tr.credit) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 font-black text-slate-900 text-xs border-t-2">
                    <td colSpan={2} className="py-3 px-4 uppercase tracking-wider">
                      Grand Total Check
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-emerald-800 text-sm">
                      {formatINR(trialTotalDebit)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-blue-800 text-sm">
                      {formatINR(trialTotalCredit)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* Subtab 3: Chart of Accounts */}
          {advancedSubTab === 'CHART_OF_ACCOUNTS' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                {
                  cat: 'Assets (1000s)',
                  color: 'border-emerald-200 bg-emerald-50/30',
                  accounts: [
                    { code: '1001', name: 'Cash in Hand (Main Drawer)' },
                    { code: '1002', name: 'Bank Accounts (HDFC / SBI Current)' },
                    { code: '1100', name: 'Accounts Receivable (Trade Debtors)' },
                    { code: '1201', name: 'Input CGST Credit' },
                    { code: '1202', name: 'Input SGST Credit' },
                    { code: '1203', name: 'Input IGST Credit' },
                    { code: '1300', name: 'Merchandise Inventory Asset' },
                  ],
                },
                {
                  cat: 'Liabilities (2000s)',
                  color: 'border-rose-200 bg-rose-50/30',
                  accounts: [
                    { code: '2001', name: 'Accounts Payable (Trade Creditors)' },
                    { code: '2101', name: 'Output CGST Payable' },
                    { code: '2102', name: 'Output SGST Payable' },
                    { code: '2103', name: 'Output IGST Payable' },
                    { code: '2200', name: 'Bank Overdraft / Loans' },
                  ],
                },
                {
                  cat: 'Revenue / Income (4000s)',
                  color: 'border-indigo-200 bg-indigo-50/30',
                  accounts: [
                    { code: '4001', name: 'Sales Revenue (Gross Goods Sold)' },
                    { code: '4002', name: 'Discount Received' },
                    { code: '4099', name: 'Inventory Gain Adjustment' },
                  ],
                },
                {
                  cat: 'Expenses & COGS (5000s & 6000s)',
                  color: 'border-amber-200 bg-amber-50/30',
                  accounts: [
                    { code: '5001', name: 'Cost of Goods Sold (Purchases)' },
                    { code: '6001', name: 'Operating Expenses (Rent, Bills)' },
                    { code: '6002', name: 'Freight & Transportation Outward' },
                    { code: '6099', name: 'Inventory Shrinkage & Loss' },
                  ],
                },
              ].map((grp) => (
                <div key={grp.cat} className={`p-4 rounded-2xl border ${grp.color} shadow-2xs`}>
                  <h4 className="font-bold text-slate-900 text-sm mb-3">{grp.cat}</h4>
                  <div className="space-y-1.5 text-xs font-mono text-slate-700">
                    {grp.accounts.map((a) => (
                      <div key={a.code} className="flex justify-between bg-white/70 p-2 rounded-lg border">
                        <span className="font-bold text-slate-900">{a.name}</span>
                        <span className="text-slate-400">{a.code}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add Expense Modal */}
      {showAddExpenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-slate-900 text-base">Record Operating Expense</h3>
              <button onClick={() => setShowAddExpenseModal(false)} className="p-1 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveExpense} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Expense Category</label>
                <select
                  value={expCategory}
                  onChange={(e) => setExpCategory(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-300 p-2.5 bg-white font-semibold"
                >
                  {EXPENSE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Amount (₹)</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={expAmount}
                  onChange={(e) => setExpAmount(Number(e.target.value) || 0)}
                  className="w-full text-sm font-bold font-mono rounded-xl border border-slate-300 p-2.5"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Date</label>
                  <input
                    type="date"
                    value={expDate}
                    onChange={(e) => setExpDate(e.target.value)}
                    className="w-full text-xs rounded-xl border border-slate-300 p-2.5"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Payment Mode</label>
                  <select
                    value={expMode}
                    onChange={(e) => setExpMode(e.target.value as any)}
                    className="w-full text-xs rounded-xl border border-slate-300 p-2.5 bg-white font-semibold"
                  >
                    <option value="BANK">Bank Transfer</option>
                    <option value="UPI">UPI Payment</option>
                    <option value="CASH">Cash Drawer</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Deduct From Account</label>
                <select
                  value={expBankId}
                  onChange={(e) => setExpBankId(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-300 p-2.5 bg-white font-semibold"
                >
                  {bankAccounts.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.bankName} (₹{b.currentBalance.toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Reference / Remarks</label>
                <input
                  type="text"
                  placeholder="Receipt number, bill ref, or notes..."
                  value={expNotes}
                  onChange={(e) => setExpNotes(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-300 p-2.5"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddExpenseModal(false)}
                  className="px-4 py-2 border rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold shadow"
                >
                  Save Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Receive Money Modal */}
      {showReceiveMoneyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-slate-900 text-base">Receive Money from Customer</h3>
              <button onClick={() => setShowReceiveMoneyModal(false)} className="p-1 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleReceiveMoney} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">From Customer</label>
                <select
                  value={recCustomerId}
                  onChange={(e) => setRecCustomerId(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-300 p-2.5 bg-white font-semibold"
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.currentBalance > 0 ? `(Owes: ₹${c.currentBalance})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Amount (₹)</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={recAmount}
                  onChange={(e) => setRecAmount(Number(e.target.value) || 0)}
                  className="w-full text-sm font-bold font-mono rounded-xl border border-slate-300 p-2.5"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Date</label>
                  <input
                    type="date"
                    value={recDate}
                    onChange={(e) => setRecDate(e.target.value)}
                    className="w-full text-xs rounded-xl border border-slate-300 p-2.5"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Payment Mode</label>
                  <select
                    value={recMode}
                    onChange={(e) => setRecMode(e.target.value as any)}
                    className="w-full text-xs rounded-xl border border-slate-300 p-2.5 bg-white font-semibold"
                  >
                    <option value="BANK">Bank IMPS/NEFT</option>
                    <option value="UPI">UPI</option>
                    <option value="CASH">Cash</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Deposit Into Account</label>
                <select
                  value={recBankId}
                  onChange={(e) => setRecBankId(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-300 p-2.5 bg-white font-semibold"
                >
                  {bankAccounts.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.bankName} (₹{b.currentBalance.toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowReceiveMoneyModal(false)}
                  className="px-4 py-2 border rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow"
                >
                  Receive Money
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Make Payment Modal */}
      {showMakePaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-slate-900 text-base">Pay Money to Supplier</h3>
              <button onClick={() => setShowMakePaymentModal(false)} className="p-1 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleMakePayment} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">To Supplier</label>
                <select
                  value={paySupplierId}
                  onChange={(e) => setPaySupplierId(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-300 p-2.5 bg-white font-semibold"
                >
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} (Due: ₹{s.currentBalance})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Amount (₹)</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(Number(e.target.value) || 0)}
                  className="w-full text-sm font-bold font-mono rounded-xl border border-slate-300 p-2.5"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Date</label>
                  <input
                    type="date"
                    value={payDate}
                    onChange={(e) => setPayDate(e.target.value)}
                    className="w-full text-xs rounded-xl border border-slate-300 p-2.5"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Payment Mode</label>
                  <select
                    value={payMode}
                    onChange={(e) => setPayMode(e.target.value as any)}
                    className="w-full text-xs rounded-xl border border-slate-300 p-2.5 bg-white font-semibold"
                  >
                    <option value="BANK">Bank NEFT/RTGS</option>
                    <option value="UPI">UPI</option>
                    <option value="CASH">Cash</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Deduct From Account</label>
                <select
                  value={payBankId}
                  onChange={(e) => setPayBankId(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-300 p-2.5 bg-white font-semibold"
                >
                  {bankAccounts.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.bankName} (₹{b.currentBalance.toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowMakePaymentModal(false)}
                  className="px-4 py-2 border rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow"
                >
                  Record Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Bank Account Modal */}
      {showAddBankModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-slate-900 text-base">Add Bank Account</h3>
              <button onClick={() => setShowAddBankModal(false)} className="p-1 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBankAccount} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Bank Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ICICI Bank, Axis Bank"
                  value={newBankName}
                  onChange={(e) => setNewBankName(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-300 p-2.5"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Account Description</label>
                <input
                  type="text"
                  placeholder="e.g. Current Account, CC Account"
                  value={newAccountName}
                  onChange={(e) => setNewAccountName(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-300 p-2.5"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Account Number</label>
                  <input
                    type="text"
                    required
                    value={newAccountNumber}
                    onChange={(e) => setNewAccountNumber(e.target.value)}
                    className="w-full text-xs font-mono rounded-xl border border-slate-300 p-2.5"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">IFSC Code</label>
                  <input
                    type="text"
                    required
                    value={newIfsc}
                    onChange={(e) => setNewIfsc(e.target.value.toUpperCase())}
                    className="w-full text-xs font-mono rounded-xl border border-slate-300 p-2.5 uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Opening Balance (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={newOpeningBal}
                  onChange={(e) => setNewOpeningBal(Number(e.target.value) || 0)}
                  className="w-full text-xs font-mono rounded-xl border border-slate-300 p-2.5"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddBankModal(false)}
                  className="px-4 py-2 border rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow"
                >
                  Save Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
