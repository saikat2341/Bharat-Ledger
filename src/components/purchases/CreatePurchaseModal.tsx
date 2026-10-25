import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Building2, Save, AlertCircle } from 'lucide-react';
import type {
  CompanyProfile,
  Supplier,
  Product,
  PurchaseInvoice,
  InvoiceItem,
  BankAccount,
  PaymentMode,
  PaymentStatus,
} from '../../types';
import { calculateItemTax, formatINR } from '../../utils/gst';
import { db, savePurchaseInvoice } from '../../db';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  company: CompanyProfile;
  suppliers: Supplier[];
  products: Product[];
  bankAccounts: BankAccount[];
}

export const CreatePurchaseModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSuccess,
  company,
  suppliers,
  products,
  bankAccounts,
}) => {
  const [purchaseNumber, setPurchaseNumber] = useState('');
  const [supplierInvoiceNumber, setSupplierInvoiceNumber] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState('');
  const [selectedSupplierId, setSelectedSupplierId] = useState('');

  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('UNPAID');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('BANK');
  const [bankAccountId, setBankAccountId] = useState(bankAccounts[0]?.id || '');
  const [paidAmount, setPaidAmount] = useState(0);
  const [notes, setNotes] = useState('');

  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function initNum() {
      const count = await db.purchases.count();
      setPurchaseNumber(`PUR-2627-${String(count + 1).padStart(3, '0')}`);
      const d = new Date();
      d.setDate(d.getDate() + 30);
      setDueDate(d.toISOString().slice(0, 10));
    }
    initNum();
  }, []);

  const selectedSupplier = suppliers.find((s) => s.id === selectedSupplierId);
  const isInterstate = selectedSupplier
    ? selectedSupplier.state.trim().toLowerCase() !== company.state.trim().toLowerCase()
    : false;

  const addItem = (product?: Product) => {
    const prod = product || products[0];
    if (!prod) return;

    const rate = prod.purchasePrice || 100;
    const taxCalc = calculateItemTax(1, rate, 0, 0, prod.gstRate, isInterstate);

    const newItem: InvoiceItem = {
      id: `it-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      productId: prod.id,
      productName: prod.name,
      hsn: prod.hsn || '',
      quantity: 1,
      unit: prod.unit || 'PCS',
      rate: rate,
      discountPercent: 0,
      discountAmount: 0,
      taxableAmount: taxCalc.taxableAmount,
      gstRate: prod.gstRate,
      cgstAmount: taxCalc.cgstAmount,
      sgstAmount: taxCalc.sgstAmount,
      igstAmount: taxCalc.igstAmount,
      totalTax: taxCalc.totalTax,
      totalAmount: taxCalc.totalAmount,
    };
    setItems((prev) => [...prev, newItem]);
  };

  const updateItem = (index: number, updates: Partial<InvoiceItem>) => {
    setItems((prev) => {
      const copy = [...prev];
      const item = { ...copy[index], ...updates };

      const taxCalc = calculateItemTax(
        item.quantity,
        item.rate,
        item.discountPercent,
        item.discountAmount,
        item.gstRate,
        isInterstate
      );

      item.taxableAmount = taxCalc.taxableAmount;
      item.cgstAmount = taxCalc.cgstAmount;
      item.sgstAmount = taxCalc.sgstAmount;
      item.igstAmount = taxCalc.igstAmount;
      item.totalTax = taxCalc.totalTax;
      item.totalAmount = taxCalc.totalAmount;

      copy[index] = item;
      return copy;
    });
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  useEffect(() => {
    if (items.length === 0 && products.length > 0) {
      addItem(products[0]);
    }
  }, [products]);

  const subtotal = items.reduce((acc, it) => acc + it.quantity * it.rate, 0);
  const taxableAmount = items.reduce((acc, it) => acc + it.taxableAmount, 0);
  const cgstTotal = items.reduce((acc, it) => acc + it.cgstAmount, 0);
  const sgstTotal = items.reduce((acc, it) => acc + it.sgstAmount, 0);
  const igstTotal = items.reduce((acc, it) => acc + it.igstAmount, 0);
  const totalTax = items.reduce((acc, it) => acc + it.totalTax, 0);

  const rawGrandTotal = taxableAmount + totalTax;
  const roundOff = Number((Math.round(rawGrandTotal) - rawGrandTotal).toFixed(2));
  const grandTotal = Number((rawGrandTotal + roundOff).toFixed(2));

  useEffect(() => {
    if (paymentStatus === 'PAID') {
      setPaidAmount(grandTotal);
    } else if (paymentStatus === 'UNPAID') {
      setPaidAmount(0);
    }
  }, [paymentStatus, grandTotal]);

  const balanceAmount = Math.max(0, Number((grandTotal - paidAmount).toFixed(2)));

  const handleSubmit = async () => {
    setErrorMsg('');
    if (!selectedSupplierId) {
      setErrorMsg('Please select a supplier');
      return;
    }
    if (items.length === 0) {
      setErrorMsg('Add at least one item');
      return;
    }

    try {
      setIsSubmitting(true);
      const sup = suppliers.find((s) => s.id === selectedSupplierId)!;

      const newPurchase: PurchaseInvoice = {
        id: `pur-${Date.now()}`,
        purchaseNumber,
        supplierInvoiceNumber: supplierInvoiceNumber.trim(),
        date,
        dueDate,
        supplierId: sup.id,
        supplierName: sup.name,
        supplierPhone: sup.phone,
        supplierGstin: sup.gstin,
        supplierAddress: sup.address,
        supplierState: sup.state,
        isInterstate,
        items,
        subtotal,
        taxableAmount,
        cgstTotal,
        sgstTotal,
        igstTotal,
        totalTax,
        roundOff,
        grandTotal,
        paymentStatus,
        paidAmount,
        balanceAmount,
        paymentMode,
        bankAccountId: paidAmount > 0 ? bankAccountId : undefined,
        notes,
        financialYear: company.financialYear || '2026-27',
        createdAt: new Date().toISOString(),
      };

      await savePurchaseInvoice(newPurchase);
      onSuccess();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save purchase bill.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[94vh] flex flex-col overflow-hidden my-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white font-bold">
              +
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">Record Vendor Purchase Bill</h2>
              <p className="text-xs text-slate-500">
                Stock will automatically increase & Input Tax Credit (ITC) will be booked
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-4 sm:p-6 space-y-5">
          {errorMsg && (
            <div className="p-3 bg-red-50 text-red-700 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Supplier</label>
              <select
                value={selectedSupplierId}
                onChange={(e) => setSelectedSupplierId(e.target.value)}
                className="w-full text-xs font-semibold rounded-xl border border-slate-300 p-2.5 bg-white"
              >
                <option value="">-- Choose Supplier --</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.state})
                  </option>
                ))}
              </select>
              {selectedSupplier && (
                <div className="text-[11px] text-slate-500 mt-1">
                  GSTIN: {selectedSupplier.gstin || 'Unregistered'} • State: {selectedSupplier.state}
                </div>
              )}
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Supplier Bill / Invoice #</label>
              <input
                type="text"
                value={supplierInvoiceNumber}
                onChange={(e) => setSupplierInvoiceNumber(e.target.value)}
                placeholder="e.g. FOX-8910"
                className="w-full text-xs font-mono font-bold rounded-xl border border-slate-300 p-2.5 bg-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Bill Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-300 p-2.5 bg-white"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Due Date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-300 p-2.5 bg-white"
                />
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-700 uppercase">Purchased Items</span>
              <button
                type="button"
                onClick={() => addItem()}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Item</span>
              </button>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-100 font-bold text-slate-700 border-b border-slate-200">
                    <th className="py-2.5 px-3 text-left">Product</th>
                    <th className="py-2.5 px-2 text-center w-24">HSN</th>
                    <th className="py-2.5 px-2 text-center w-20">Qty</th>
                    <th className="py-2.5 px-2 text-right w-24">Purchase Rate</th>
                    <th className="py-2.5 px-2 text-center w-20">GST %</th>
                    <th className="py-2.5 px-2 text-right w-24">Tax (₹)</th>
                    <th className="py-2.5 px-3 text-right w-28">Total (₹)</th>
                    <th className="py-2.5 px-2 text-center w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((it, idx) => (
                    <tr key={it.id}>
                      <td className="py-2 px-3">
                        <select
                          value={it.productId}
                          onChange={(e) => {
                            const p = products.find((x) => x.id === e.target.value);
                            if (p)
                              updateItem(idx, {
                                productId: p.id,
                                productName: p.name,
                                hsn: p.hsn,
                                rate: p.purchasePrice,
                                gstRate: p.gstRate,
                              });
                          }}
                          className="w-full border border-slate-300 rounded p-1 text-xs"
                        >
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2 px-2 text-center font-mono">{it.hsn}</td>
                      <td className="py-2 px-2 text-center">
                        <input
                          type="number"
                          min="1"
                          value={it.quantity}
                          onChange={(e) => updateItem(idx, { quantity: Number(e.target.value) || 1 })}
                          className="w-full text-center border border-slate-300 rounded p-1 text-xs font-bold"
                        />
                      </td>
                      <td className="py-2 px-2 text-right">
                        <input
                          type="number"
                          min="0"
                          value={it.rate}
                          onChange={(e) => updateItem(idx, { rate: Number(e.target.value) || 0 })}
                          className="w-full text-right border border-slate-300 rounded p-1 text-xs font-mono"
                        />
                      </td>
                      <td className="py-2 px-2 text-center font-mono">{it.gstRate}%</td>
                      <td className="py-2 px-2 text-right font-mono">{formatINR(it.totalTax).replace('₹', '')}</td>
                      <td className="py-2 px-3 text-right font-mono font-bold">
                        {formatINR(it.totalAmount).replace('₹', '')}
                      </td>
                      <td className="py-2 px-2 text-center">
                        <button onClick={() => removeItem(idx)} className="text-slate-400 hover:text-red-600">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Payment & Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="p-4 border border-slate-200 rounded-xl bg-slate-50 space-y-2">
              <span className="text-xs font-bold text-slate-700 block">Payment Terms</span>
              <div className="flex gap-2">
                {(['UNPAID', 'PARTIAL', 'PAID'] as PaymentStatus[]).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setPaymentStatus(st)}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg border ${
                      paymentStatus === st ? 'bg-slate-900 text-white' : 'bg-white text-slate-700'
                    }`}
                  >
                    {st === 'UNPAID' ? 'Credit (Unpaid)' : st === 'PARTIAL' ? 'Partial' : 'Full Paid'}
                  </button>
                ))}
              </div>

              {paymentStatus !== 'UNPAID' && (
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 block mb-1">Paid Amount (₹)</label>
                    <input
                      type="number"
                      value={paidAmount}
                      onChange={(e) => setPaidAmount(Number(e.target.value) || 0)}
                      className="w-full text-xs font-mono font-bold rounded border border-slate-300 p-2 bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 block mb-1">Paid From Account</label>
                    <select
                      value={bankAccountId}
                      onChange={(e) => setBankAccountId(e.target.value)}
                      className="w-full text-xs rounded border border-slate-300 p-2 bg-white"
                    >
                      {bankAccounts.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.bankName} (₹{b.currentBalance.toLocaleString()})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border border-slate-200 rounded-xl bg-slate-50 space-y-2 text-xs">
              <div className="flex justify-between">
                <span>Taxable Value:</span>
                <span className="font-mono">{formatINR(taxableAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span>Input GST Credit (ITC):</span>
                <span className="font-mono">{formatINR(totalTax)}</span>
              </div>
              <div className="border-t border-slate-300 pt-2 flex justify-between font-bold text-sm text-slate-900">
                <span>Grand Total:</span>
                <span className="font-mono text-base">{formatINR(grandTotal)}</span>
              </div>
              <div className="flex justify-between text-rose-600 font-bold">
                <span>Payable Balance:</span>
                <span className="font-mono">{formatINR(balanceAmount)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-between px-6 py-4 border-t border-slate-200 bg-slate-50">
          <button onClick={onClose} className="px-4 py-2 border rounded-xl text-xs font-semibold">
            Cancel
          </button>
          <button
            disabled={isSubmitting}
            onClick={handleSubmit}
            className="px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow"
          >
            {isSubmitting ? 'Saving...' : 'Save Purchase Bill'}
          </button>
        </div>
      </div>
    </div>
  );
};
