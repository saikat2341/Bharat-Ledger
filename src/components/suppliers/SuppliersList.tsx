import React, { useState } from 'react';
import { Plus, Search, Building2, Phone, Printer, X, ArrowUpRight } from 'lucide-react';
import type { Supplier, PurchaseInvoice, PaymentRecord, BankAccount } from '../../types';
import { formatINR, INDIAN_STATES } from '../../utils/gst';
import { db, recordPayment } from '../../db';

interface Props {
  suppliers: Supplier[];
  purchases: PurchaseInvoice[];
  payments: PaymentRecord[];
  bankAccounts: BankAccount[];
  onRefresh: () => void;
  onNewPurchaseForSupplier: (supplierId: string) => void;
}

export const SuppliersList: React.FC<Props> = ({
  suppliers,
  purchases,
  payments,
  bankAccounts,
  onRefresh,
  onNewPurchaseForSupplier,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedLedgerSupplier, setSelectedLedgerSupplier] = useState<Supplier | null>(null);
  const [payModalSupplier, setPayModalSupplier] = useState<Supplier | null>(null);

  // Add Supplier Form
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [state, setState] = useState('Maharashtra');
  const [gstin, setGstin] = useState('');
  const [openingBalance, setOpeningBalance] = useState(0);

  // Pay Supplier Form
  const [payAmount, setPayAmount] = useState(0);
  const [payDate, setPayDate] = useState(new Date().toISOString().slice(0, 10));
  const [payMode, setPayMode] = useState<'BANK' | 'CASH' | 'UPI'>('BANK');
  const [payBankId, setPayBankId] = useState(bankAccounts[0]?.id || '');
  const [payRef, setPayRef] = useState('');
  const [payNotes, setPayNotes] = useState('');

  const filtered = suppliers.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.phone.includes(searchTerm) ||
      (s.gstin && s.gstin.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalPayable = suppliers.reduce((sum, s) => sum + s.currentBalance, 0);

  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const matchedState = INDIAN_STATES.find((s) => s.name.toLowerCase() === state.toLowerCase());

    const newSup: Supplier = {
      id: `sup-${Date.now()}`,
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      address: address.trim(),
      city: '',
      state,
      stateCode: matchedState?.code || '27',
      pinCode: '',
      gstin: gstin.trim().toUpperCase(),
      pan: gstin.length >= 12 ? gstin.substring(2, 12) : '',
      openingBalance: Number(openingBalance) || 0,
      currentBalance: Number(openingBalance) || 0,
      paymentTermsDays: 30,
      createdAt: new Date().toISOString(),
    };

    await db.suppliers.add(newSup);
    setShowAddModal(false);
    setName('');
    setPhone('');
    setEmail('');
    setAddress('');
    setGstin('');
    setOpeningBalance(0);
    onRefresh();
  };

  const handlePaySupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payModalSupplier || payAmount <= 0) return;

    await recordPayment({
      id: `pay-${Date.now()}`,
      type: 'PAY',
      partyType: 'SUPPLIER',
      partyId: payModalSupplier.id,
      partyName: payModalSupplier.name,
      amount: Number(payAmount),
      date: payDate,
      paymentMode: payMode,
      bankAccountId: payBankId,
      referenceNo: payRef,
      notes: payNotes || `Payment made to supplier ${payModalSupplier.name}`,
      createdAt: new Date().toISOString(),
    });

    setPayModalSupplier(null);
    setPayAmount(0);
    setPayRef('');
    setPayNotes('');
    onRefresh();
  };

  const getSupplierLedger = (supplierId: string) => {
    const sup = suppliers.find((s) => s.id === supplierId);
    if (!sup) return [];

    type Row = { date: string; description: string; reference: string; debit: number; credit: number; balance: number };
    const rows: Row[] = [];
    let runningBalance = sup.openingBalance || 0;

    if (sup.openingBalance > 0) {
      rows.push({
        date: sup.createdAt.slice(0, 10),
        description: 'Opening Payable Balance',
        reference: 'OPENING',
        debit: 0,
        credit: sup.openingBalance,
        balance: runningBalance,
      });
    }

    const supPurchases = purchases.filter((p) => p.supplierId === supplierId && p.paymentStatus !== 'CANCELLED');
    const supPayments = payments.filter((p) => p.partyId === supplierId && p.partyType === 'SUPPLIER');

    const combined = [
      ...supPurchases.map((p) => ({
        date: p.date,
        type: 'PURCHASE' as const,
        description: `Purchase Bill #${p.purchaseNumber}`,
        reference: p.purchaseNumber,
        amount: p.grandTotal,
        paidNow: p.paidAmount,
      })),
      ...supPayments.map((pm) => ({
        date: pm.date,
        type: 'PAYMENT' as const,
        description: `Payment Made (${pm.paymentMode})`,
        reference: pm.referenceNo || 'PAYMENT',
        amount: pm.amount,
        paidNow: 0,
      })),
    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    for (const item of combined) {
      if (item.type === 'PURCHASE') {
        runningBalance += item.amount;
        rows.push({
          date: item.date,
          description: item.description,
          reference: item.reference,
          debit: 0,
          credit: item.amount,
          balance: runningBalance,
        });
        if (item.paidNow > 0) {
          runningBalance -= item.paidNow;
          rows.push({
            date: item.date,
            description: `Paid during bill creation`,
            reference: 'PAID-BILL',
            debit: item.paidNow,
            credit: 0,
            balance: runningBalance,
          });
        }
      } else {
        runningBalance -= item.amount;
        rows.push({
          date: item.date,
          description: item.description,
          reference: item.reference,
          debit: item.amount,
          credit: 0,
          balance: runningBalance,
        });
      }
    }
    return rows;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Suppliers & Vendor Accounts</h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Vendor master, accounts payable, payment dispatches, and vendor ledger statements.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs sm:text-sm font-bold shadow transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>+ Add Supplier</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            Total Suppliers
          </span>
          <div className="text-xl sm:text-2xl font-black font-mono text-slate-900">{suppliers.length}</div>
          <p className="text-[11px] text-slate-400 mt-1">Authorized vendors & distributors</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            Total Payable Dues
          </span>
          <div className="text-xl sm:text-2xl font-black font-mono text-rose-600">{formatINR(totalPayable)}</div>
          <p className="text-[11px] text-slate-400 mt-1">Pending payments to suppliers</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            Suppliers to Pay
          </span>
          <div className="text-xl sm:text-2xl font-black font-mono text-amber-600">
            {suppliers.filter((s) => s.currentBalance > 0).length}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">With outstanding balances</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search supplier by name, phone or GSTIN..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase">
                <th className="py-3 px-4">Supplier Name</th>
                <th className="py-3 px-3">Contact</th>
                <th className="py-3 px-3">State / GSTIN</th>
                <th className="py-3 px-4 text-right">Payable Balance</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
              {filtered.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/80">
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900">{s.name}</div>
                    {s.address && <div className="text-[11px] text-slate-400">{s.address}</div>}
                  </td>
                  <td className="py-3 px-3 font-mono text-xs">{s.phone || '-'}</td>
                  <td className="py-3 px-3">
                    <div className="text-xs font-semibold text-slate-700">{s.state}</div>
                    <div className="font-mono text-[10px] text-slate-500">{s.gstin || 'Unregistered'}</div>
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold">
                    {s.currentBalance > 0 ? (
                      <span className="text-rose-600">{formatINR(s.currentBalance)}</span>
                    ) : (
                      <span className="text-slate-400">₹0.00</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => setSelectedLedgerSupplier(s)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors"
                      >
                        Ledger
                      </button>
                      {s.currentBalance > 0 && (
                        <button
                          onClick={() => {
                            setPayModalSupplier(s);
                            setPayAmount(s.currentBalance);
                          }}
                          className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-bold transition-colors"
                        >
                          Pay Vendor
                        </button>
                      )}
                      <button
                        onClick={() => onNewPurchaseForSupplier(s.id)}
                        className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-colors"
                      >
                        + Purchase
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-14 text-center">
                    <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
                      <Building2 className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-bold text-slate-800">No Suppliers Registered</p>
                    <p className="text-xs text-slate-500 mt-1 mb-4">
                      {searchTerm ? 'No vendors matched your search query.' : 'Add your suppliers and vendors to record purchase bills and manage ITC.'}
                    </p>
                    {!searchTerm && (
                      <button
                        onClick={() => setShowAddModal(true)}
                        className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                      >
                        + Add First Supplier
                      </button>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Supplier Ledger Modal */}
      {selectedLedgerSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-900 text-base">{selectedLedgerSupplier.name}</h3>
                <p className="text-xs text-slate-500">
                  Supplier Statement • GSTIN: {selectedLedgerSupplier.gstin || 'Unregistered'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print</span>
                </button>
                <button
                  onClick={() => setSelectedLedgerSupplier(null)}
                  className="p-1 text-slate-400 hover:text-slate-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto p-6 space-y-4">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex justify-between items-center">
                <div>
                  <span className="text-xs text-slate-500 block uppercase font-semibold">Total Payable Due</span>
                  <div className="text-2xl font-black font-mono text-rose-600">
                    {formatINR(selectedLedgerSupplier.currentBalance)}
                  </div>
                </div>
                <div className="text-right text-xs text-slate-500">
                  <div>Payment Terms: 30 Days</div>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold border-b">
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Particulars</th>
                      <th className="py-2.5 px-3 text-right">Debit (Paid)</th>
                      <th className="py-2.5 px-3 text-right">Credit (Bill)</th>
                      <th className="py-2.5 px-3 text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {getSupplierLedger(selectedLedgerSupplier.id).map((entry, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-3 font-mono text-slate-600">{entry.date}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-800">{entry.description}</td>
                        <td className="py-2.5 px-3 text-right font-mono text-emerald-700">
                          {entry.debit > 0 ? formatINR(entry.debit) : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-rose-700">
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
                onClick={() => setSelectedLedgerSupplier(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pay Supplier Modal */}
      {payModalSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Make Payment to Vendor</h3>
                <p className="text-xs text-slate-500">To {payModalSupplier.name}</p>
              </div>
              <button onClick={() => setPayModalSupplier(null)} className="p-1 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePaySupplier} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Amount to Pay (₹)</label>
                <input
                  type="number"
                  min="1"
                  step="any"
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(Number(e.target.value) || 0)}
                  className="w-full text-base font-bold font-mono rounded-xl border border-slate-300 p-2.5"
                />
                <div className="text-[11px] text-slate-500 mt-1">
                  Outstanding balance: {formatINR(payModalSupplier.currentBalance)}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Payment Date</label>
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
                    <option value="BANK">Bank Transfer / NEFT</option>
                    <option value="UPI">UPI Payment</option>
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
                      {b.bankName} - {b.accountName} (₹{b.currentBalance.toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">UTR / Cheque Number</label>
                <input
                  type="text"
                  placeholder="e.g. UTR-872910"
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-300 p-2.5"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPayModalSupplier(null)}
                  className="px-4 py-2 border rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow"
                >
                  Record Vendor Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Supplier Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-slate-900 text-base">Add New Supplier / Vendor</h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSupplier} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Supplier / Firm Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Schneider Electrical Wholesale"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-300 p-2.5"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Phone</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full text-xs rounded-xl border border-slate-300 p-2.5"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full text-xs rounded-xl border border-slate-300 p-2.5"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">GSTIN</label>
                  <input
                    type="text"
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value.toUpperCase())}
                    className="w-full text-xs font-mono rounded-xl border border-slate-300 p-2.5"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">State</label>
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
                <label className="text-xs font-bold text-slate-700 block mb-1">Opening Payable Balance (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={openingBalance}
                  onChange={(e) => setOpeningBalance(Number(e.target.value) || 0)}
                  className="w-full text-xs font-mono rounded-xl border border-slate-300 p-2.5"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold shadow"
                >
                  Save Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
