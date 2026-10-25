import React, { useState } from 'react';
import {
  Plus,
  Search,
  UserCheck,
  Phone,
  Building,
  CreditCard,
  Printer,
  FileText,
  Copy,
  Check,
  ArrowDownLeft,
  X,
  MessageSquare,
  Users,
} from 'lucide-react';
import type { Customer, SaleInvoice, PaymentRecord, BankAccount } from '../../types';
import { formatINR, validateGSTIN, INDIAN_STATES } from '../../utils/gst';
import { db, recordPayment } from '../../db';

interface Props {
  customers: Customer[];
  sales: SaleInvoice[];
  payments: PaymentRecord[];
  bankAccounts: BankAccount[];
  onRefresh: () => void;
  onNewSaleForCustomer: (customerId: string) => void;
}

export const CustomersList: React.FC<Props> = ({
  customers,
  sales,
  payments,
  bankAccounts,
  onRefresh,
  onNewSaleForCustomer,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedLedgerCustomer, setSelectedLedgerCustomer] = useState<Customer | null>(null);
  const [receivePaymentCustomer, setReceivePaymentCustomer] = useState<Customer | null>(null);
  const [reminderCustomer, setReminderCustomer] = useState<Customer | null>(null);
  const [copiedReminder, setCopiedReminder] = useState(false);

  // Add Customer Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('Maharashtra');
  const [gstin, setGstin] = useState('');
  const [pan, setPan] = useState('');
  const [creditLimit, setCreditLimit] = useState(100000);
  const [openingBalance, setOpeningBalance] = useState(0);

  // Receive Money Form State
  const [receiveAmount, setReceiveAmount] = useState(0);
  const [receiveDate, setReceiveDate] = useState(new Date().toISOString().slice(0, 10));
  const [receiveMode, setReceiveMode] = useState<'BANK' | 'CASH' | 'UPI'>('BANK');
  const [receiveBankId, setReceiveBankId] = useState(bankAccounts[0]?.id || '');
  const [receiveRef, setReceiveRef] = useState('');
  const [receiveNotes, setReceiveNotes] = useState('');

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm) ||
      (c.gstin && c.gstin.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalOutstanding = customers.reduce((sum, c) => sum + c.currentBalance, 0);

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const matchedState = INDIAN_STATES.find((s) => s.name.toLowerCase() === state.toLowerCase());

    const newCust: Customer = {
      id: `cust-${Date.now()}`,
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      address: address.trim(),
      city: city.trim(),
      state,
      stateCode: matchedState?.code || '27',
      pinCode: '',
      gstin: gstin.trim().toUpperCase(),
      pan: pan.trim().toUpperCase() || (gstin.length >= 12 ? gstin.substring(2, 12) : ''),
      openingBalance: Number(openingBalance) || 0,
      currentBalance: Number(openingBalance) || 0,
      creditLimit: Number(creditLimit) || 50000,
      paymentTermsDays: 15,
      createdAt: new Date().toISOString(),
    };

    await db.customers.add(newCust);
    setShowAddModal(false);
    setName('');
    setPhone('');
    setEmail('');
    setAddress('');
    setGstin('');
    setOpeningBalance(0);
    onRefresh();
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receivePaymentCustomer || receiveAmount <= 0) return;

    await recordPayment({
      id: `pay-${Date.now()}`,
      type: 'RECEIVE',
      partyType: 'CUSTOMER',
      partyId: receivePaymentCustomer.id,
      partyName: receivePaymentCustomer.name,
      amount: Number(receiveAmount),
      date: receiveDate,
      paymentMode: receiveMode,
      bankAccountId: receiveBankId,
      referenceNo: receiveRef,
      notes: receiveNotes || `Payment received from ${receivePaymentCustomer.name}`,
      createdAt: new Date().toISOString(),
    });

    setReceivePaymentCustomer(null);
    setReceiveAmount(0);
    setReceiveRef('');
    setReceiveNotes('');
    onRefresh();
  };

  // Generate Customer Ledger Statement
  const getCustomerLedgerEntries = (customerId: string) => {
    const cust = customers.find((c) => c.id === customerId);
    if (!cust) return [];

    type LedgerRow = {
      date: string;
      description: string;
      reference: string;
      debit: number; // Sale invoice (owed to us)
      credit: number; // Payment received
      balance: number;
    };

    const rows: LedgerRow[] = [];
    let runningBalance = cust.openingBalance || 0;

    if (cust.openingBalance > 0) {
      rows.push({
        date: cust.createdAt.slice(0, 10),
        description: 'Opening Balance',
        reference: 'OPENING',
        debit: cust.openingBalance,
        credit: 0,
        balance: runningBalance,
      });
    }

    const custSales = sales.filter((s) => s.customerId === customerId && s.paymentStatus !== 'CANCELLED');
    const custPayments = payments.filter((p) => p.partyId === customerId && p.partyType === 'CUSTOMER');

    const combined = [
      ...custSales.map((s) => ({
        date: s.date,
        type: 'SALE' as const,
        description: `Tax Invoice #${s.invoiceNumber}`,
        reference: s.invoiceNumber,
        amount: s.grandTotal,
        paidNow: s.paidAmount,
      })),
      ...custPayments.map((p) => ({
        date: p.date,
        type: 'PAYMENT' as const,
        description: `Payment Received (${p.paymentMode})`,
        reference: p.referenceNo || 'RECEIPT',
        amount: p.amount,
        paidNow: 0,
      })),
    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    for (const item of combined) {
      if (item.type === 'SALE') {
        runningBalance += item.amount;
        rows.push({
          date: item.date,
          description: item.description,
          reference: item.reference,
          debit: item.amount,
          credit: 0,
          balance: runningBalance,
        });

        // If immediate payment on invoice
        if (item.paidNow > 0) {
          runningBalance -= item.paidNow;
          rows.push({
            date: item.date,
            description: `Payment Received for ${item.reference}`,
            reference: 'COUNTER-PAY',
            debit: 0,
            credit: item.paidNow,
            balance: runningBalance,
          });
        }
      } else {
        runningBalance -= item.amount;
        rows.push({
          date: item.date,
          description: item.description,
          reference: item.reference,
          debit: 0,
          credit: item.amount,
          balance: runningBalance,
        });
      }
    }

    return rows;
  };

  const reminderMessageText = reminderCustomer
    ? `Dear ${reminderCustomer.name},\n\nGreetings from our finance team. This is a gentle reminder regarding outstanding payment of ${formatINR(
        reminderCustomer.currentBalance
      )} against supplies.\n\nKindly arrange the clearance at your earliest convenience via NEFT/IMPS or UPI.\n\nThank you for your business!`
    : '';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Customer Accounts & Receivables</h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Customer directory, outstanding dues, payment receipt entry, and ledger statements.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-indigo-100 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>+ Add Customer</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            Total Customers
          </span>
          <div className="text-xl sm:text-2xl font-black font-mono text-slate-900">{customers.length}</div>
          <p className="text-[11px] text-slate-400 mt-1">Active client relationships</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            Total Customer Dues (Receivable)
          </span>
          <div className="text-xl sm:text-2xl font-black font-mono text-rose-600">{formatINR(totalOutstanding)}</div>
          <p className="text-[11px] text-slate-400 mt-1">Total credit extended</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            Customers with Dues
          </span>
          <div className="text-xl sm:text-2xl font-black font-mono text-amber-600">
            {customers.filter((c) => c.currentBalance > 0).length}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Require follow-up & reminders</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search customer by name, phone or GSTIN..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase">
                <th className="py-3 px-4">Customer Name</th>
                <th className="py-3 px-3">Contact</th>
                <th className="py-3 px-3">State / GSTIN</th>
                <th className="py-3 px-3 text-right">Credit Limit</th>
                <th className="py-3 px-4 text-right">Current Balance</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/80">
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900">{c.name}</div>
                    {c.city && <div className="text-[11px] text-slate-400">{c.city}</div>}
                  </td>

                  <td className="py-3 px-3">
                    <div className="font-mono text-xs">{c.phone || '-'}</div>
                    {c.email && <div className="text-[11px] text-slate-400">{c.email}</div>}
                  </td>

                  <td className="py-3 px-3">
                    <div className="font-medium text-xs text-slate-700">{c.state}</div>
                    <div className="font-mono text-[10px] text-slate-500">{c.gstin || 'Consumer'}</div>
                  </td>

                  <td className="py-3 px-3 text-right font-mono text-slate-600">{formatINR(c.creditLimit)}</td>

                  <td className="py-3 px-4 text-right font-mono font-bold">
                    {c.currentBalance > 0 ? (
                      <span className="text-rose-600">{formatINR(c.currentBalance)}</span>
                    ) : (
                      <span className="text-emerald-700">₹0.00</span>
                    )}
                  </td>

                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => setSelectedLedgerCustomer(c)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors"
                        title="View Customer Statement / Ledger"
                      >
                        Ledger
                      </button>

                      {c.currentBalance > 0 && (
                        <>
                          <button
                            onClick={() => {
                              setReceivePaymentCustomer(c);
                              setReceiveAmount(c.currentBalance);
                            }}
                            className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-xs font-bold transition-colors"
                            title="Receive payment from customer"
                          >
                            Receive
                          </button>

                          <button
                            onClick={() => {
                              setReminderCustomer(c);
                              setCopiedReminder(false);
                            }}
                            className="p-1 rounded-lg text-amber-600 hover:bg-amber-50"
                            title="Payment Reminder"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </button>
                        </>
                      )}

                      <button
                        onClick={() => onNewSaleForCustomer(c.id)}
                        className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition-colors"
                        title="Create New Invoice for Customer"
                      >
                        + Sale
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-14 text-center">
                    <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
                      <Users className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-bold text-slate-800">No Customers Added Yet</p>
                    <p className="text-xs text-slate-500 mt-1 mb-4">
                      {searchTerm ? 'No customers matched your search query.' : 'Add your first customer to generate tax invoices and track outstanding dues.'}
                    </p>
                    {!searchTerm && (
                      <button
                        onClick={() => setShowAddModal(true)}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                      >
                        + Add First Customer
                      </button>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer Ledger Statement Modal */}
      {selectedLedgerCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-900 text-base">{selectedLedgerCustomer.name}</h3>
                <p className="text-xs text-slate-500">
                  Customer Statement of Account • GSTIN: {selectedLedgerCustomer.gstin || 'Unregistered'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print</span>
                </button>
                <button
                  onClick={() => setSelectedLedgerCustomer(null)}
                  className="p-1 text-slate-400 hover:text-slate-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto p-6 space-y-4">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex justify-between items-center">
                <div>
                  <span className="text-xs text-slate-500 block uppercase font-semibold">Net Balance Receivable</span>
                  <div className="text-2xl font-black font-mono text-rose-600">
                    {formatINR(selectedLedgerCustomer.currentBalance)}
                  </div>
                </div>
                <div className="text-right text-xs text-slate-500">
                  <div>Credit Limit: {formatINR(selectedLedgerCustomer.creditLimit)}</div>
                  <div>Payment Terms: 15 Days</div>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold border-b">
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Particulars / Voucher</th>
                      <th className="py-2.5 px-3 text-right">Debit (₹)</th>
                      <th className="py-2.5 px-3 text-right">Credit (₹)</th>
                      <th className="py-2.5 px-3 text-right">Balance (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {getCustomerLedgerEntries(selectedLedgerCustomer.id).map((entry, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-3 text-slate-600 font-mono">{entry.date}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-800">{entry.description}</td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-800">
                          {entry.debit > 0 ? formatINR(entry.debit) : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-emerald-700">
                          {entry.credit > 0 ? formatINR(entry.credit) : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                          {formatINR(entry.balance)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="px-6 py-3 border-t bg-slate-50 flex justify-end">
              <button
                onClick={() => setSelectedLedgerCustomer(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receive Money Quick Modal */}
      {receivePaymentCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Receive Payment</h3>
                <p className="text-xs text-slate-500">From {receivePaymentCustomer.name}</p>
              </div>
              <button onClick={() => setReceivePaymentCustomer(null)} className="p-1 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Amount to Receive (₹)</label>
                <input
                  type="number"
                  min="1"
                  step="any"
                  required
                  value={receiveAmount}
                  onChange={(e) => setReceiveAmount(Number(e.target.value) || 0)}
                  className="w-full text-base font-bold font-mono rounded-xl border border-slate-300 p-2.5"
                />
                <div className="text-[11px] text-slate-500 mt-1">
                  Current total due: {formatINR(receivePaymentCustomer.currentBalance)}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Payment Date</label>
                  <input
                    type="date"
                    value={receiveDate}
                    onChange={(e) => setReceiveDate(e.target.value)}
                    className="w-full text-xs rounded-xl border border-slate-300 p-2.5"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Payment Mode</label>
                  <select
                    value={receiveMode}
                    onChange={(e) => setReceiveMode(e.target.value as any)}
                    className="w-full text-xs rounded-xl border border-slate-300 p-2.5 bg-white font-semibold"
                  >
                    <option value="BANK">Bank Transfer / IMPS</option>
                    <option value="UPI">UPI Payment</option>
                    <option value="CASH">Cash</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Deposit Into Account</label>
                <select
                  value={receiveBankId}
                  onChange={(e) => setReceiveBankId(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-300 p-2.5 bg-white font-semibold"
                >
                  {bankAccounts.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.bankName} - {b.accountName} (₹{b.currentBalance.toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Cheque / UTR / Transaction Ref</label>
                <input
                  type="text"
                  placeholder="e.g. UTR-9821739812"
                  value={receiveRef}
                  onChange={(e) => setReceiveRef(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-300 p-2.5"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReceivePaymentCustomer(null)}
                  className="px-4 py-2 border rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow"
                >
                  Record Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Reminder Generator Modal */}
      {reminderCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Payment Reminder</h3>
                <p className="text-xs text-slate-500">For {reminderCustomer.name}</p>
              </div>
              <button onClick={() => setReminderCustomer(null)} className="p-1 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 whitespace-pre-line font-medium leading-relaxed">
              {reminderMessageText}
            </div>

            <div className="flex justify-between items-center pt-2">
              <span className="text-xs text-slate-500">Copy to paste on WhatsApp or Email</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(reminderMessageText);
                  setCopiedReminder(true);
                  setTimeout(() => setCopiedReminder(false), 2000);
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow"
              >
                {copiedReminder ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy Text</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Customer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b bg-slate-50">
              <h3 className="font-bold text-slate-900 text-base">Add New Customer</h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} className="overflow-y-auto p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Customer / Enterprise Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apex Hardware Retailers"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-300 p-2.5"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Mobile / Phone Number</label>
                  <input
                    type="text"
                    placeholder="e.g. 9820012345"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full text-xs rounded-xl border border-slate-300 p-2.5"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="billing@customer.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full text-xs rounded-xl border border-slate-300 p-2.5"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">GSTIN (15 Digits)</label>
                  <input
                    type="text"
                    placeholder="e.g. 27AABCA1234F1Z5"
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value.toUpperCase())}
                    className="w-full text-xs font-mono rounded-xl border border-slate-300 p-2.5"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">State of Supply</label>
                  <select
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full text-xs rounded-xl border border-slate-300 p-2.5 bg-white font-semibold"
                  >
                    {INDIAN_STATES.map((s) => (
                      <option key={s.code} value={s.name}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Billing Address</label>
                <input
                  type="text"
                  placeholder="Street, Area, Landmark"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-300 p-2.5"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Opening Balance (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={openingBalance}
                    onChange={(e) => setOpeningBalance(Number(e.target.value) || 0)}
                    className="w-full text-xs font-mono rounded-xl border border-slate-300 p-2.5"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Credit Limit (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={creditLimit}
                    onChange={(e) => setCreditLimit(Number(e.target.value) || 0)}
                    className="w-full text-xs font-mono rounded-xl border border-slate-300 p-2.5"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold"
                >
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
