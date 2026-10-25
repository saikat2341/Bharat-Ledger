import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  Search,
  UserPlus,
  CreditCard,
  Building,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  Save,
  Printer,
  Sparkles,
} from 'lucide-react';
import type {
  CompanyProfile,
  Customer,
  Product,
  SaleInvoice,
  InvoiceItem,
  BankAccount,
  PaymentMode,
  PaymentStatus,
} from '../../types';
import { calculateItemTax, formatINR, validateGSTIN } from '../../utils/gst';
import { db, saveSaleInvoice } from '../../db';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (savedInvoice: SaleInvoice) => void;
  company: CompanyProfile;
  customers: Customer[];
  products: Product[];
  bankAccounts: BankAccount[];
}

export const CreateSaleModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSuccess,
  company,
  customers,
  products,
  bankAccounts,
}) => {
  // Auto-generate invoice number
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentTermsDays, setPaymentTermsDays] = useState(15);
  const [dueDate, setDueDate] = useState('');

  // Customer state
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [showAddCustomerInline, setShowAddCustomerInline] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustGstin, setNewCustGstin] = useState('');
  const [newCustState, setNewCustState] = useState(company.state);

  // Invoice Items
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [invoiceDiscount, setInvoiceDiscount] = useState(0);
  const [roundOffEnabled, setRoundOffEnabled] = useState(company.roundOffEnabled ?? true);
  const [notes, setNotes] = useState(company.notes || '');

  // Payment details
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('UNPAID');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('BANK');
  const [bankAccountId, setBankAccountId] = useState(
    bankAccounts.find((b) => b.isDefault)?.id || bankAccounts[0]?.id || ''
  );
  const [paidAmount, setPaidAmount] = useState(0);

  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize Invoice Number & Due Date on Mount
  useEffect(() => {
    async function initNum() {
      const count = await db.sales.count();
      const num = (company.invoiceStartNumber || 101) + count;
      const prefix = company.invoicePrefix || 'INV-2627-';
      setInvoiceNumber(`${prefix}${num}`);
    }
    initNum();
  }, [company]);

  // Update Due Date based on date and paymentTermsDays
  useEffect(() => {
    if (!date) return;
    const d = new Date(date);
    d.setDate(d.getDate() + Number(paymentTermsDays));
    setDueDate(d.toISOString().slice(0, 10));
  }, [date, paymentTermsDays]);

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  // Determine whether this is interstate (IGST) or intrastate (CGST + SGST)
  const isInterstate = selectedCustomer
    ? selectedCustomer.state.trim().toLowerCase() !== company.state.trim().toLowerCase()
    : false;

  const placeOfSupply = selectedCustomer
    ? `${selectedCustomer.state} (${selectedCustomer.stateCode || 'Interstate'})`
    : `${company.state} (${company.stateCode || '27'})`;

  // Add Item to table
  const addItem = (product?: Product) => {
    const prod = product || products[0];
    if (!prod) return;

    const rate = prod.sellingPrice || 100;
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

  // Recalculate row when changed
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

  // Handle switching product on a row
  const handleProductSelect = (index: number, productId: string) => {
    const p = products.find((x) => x.id === productId);
    if (!p) return;
    updateItem(index, {
      productId: p.id,
      productName: p.name,
      hsn: p.hsn,
      unit: p.unit,
      rate: p.sellingPrice,
      gstRate: p.gstRate,
    });
  };

  // Add default item if empty
  useEffect(() => {
    if (items.length === 0 && products.length > 0) {
      addItem(products[0]);
    }
  }, [products]);

  // Calculations across invoice
  const subtotal = items.reduce((acc, it) => acc + it.quantity * it.rate, 0);
  const taxableAmount = items.reduce((acc, it) => acc + it.taxableAmount, 0);
  const cgstTotal = items.reduce((acc, it) => acc + it.cgstAmount, 0);
  const sgstTotal = items.reduce((acc, it) => acc + it.sgstAmount, 0);
  const igstTotal = items.reduce((acc, it) => acc + it.igstAmount, 0);
  const totalTax = items.reduce((acc, it) => acc + it.totalTax, 0);

  const rawGrandTotal = taxableAmount + totalTax - (invoiceDiscount || 0);
  const roundOff = roundOffEnabled ? Number((Math.round(rawGrandTotal) - rawGrandTotal).toFixed(2)) : 0;
  const grandTotal = Number((rawGrandTotal + roundOff).toFixed(2));

  // Auto-sync paid amount if status is PAID or UNPAID
  useEffect(() => {
    if (paymentStatus === 'PAID') {
      setPaidAmount(grandTotal);
    } else if (paymentStatus === 'UNPAID') {
      setPaidAmount(0);
    }
  }, [paymentStatus, grandTotal]);

  const balanceAmount = Math.max(0, Number((grandTotal - paidAmount).toFixed(2)));

  // Inline Customer Creation
  const handleCreateCustomerInline = async () => {
    if (!newCustName.trim()) {
      setErrorMsg('Customer name is required');
      return;
    }
    const newCust: Customer = {
      id: `cust-${Date.now()}`,
      name: newCustName.trim(),
      phone: newCustPhone.trim(),
      email: '',
      address: '',
      city: '',
      state: newCustState,
      stateCode: '',
      pinCode: '',
      gstin: newCustGstin.trim().toUpperCase(),
      pan: '',
      openingBalance: 0,
      currentBalance: 0,
      creditLimit: 50000,
      paymentTermsDays: 15,
      createdAt: new Date().toISOString(),
    };
    await db.customers.add(newCust);
    customers.push(newCust);
    setSelectedCustomerId(newCust.id);
    setShowAddCustomerInline(false);
    setNewCustName('');
    setNewCustPhone('');
    setNewCustGstin('');
  };

  // Submit and save sale
  const handleSubmit = async () => {
    setErrorMsg('');
    if (!selectedCustomerId) {
      setErrorMsg('Please select a customer for this invoice.');
      return;
    }
    if (items.length === 0) {
      setErrorMsg('Please add at least one item to the invoice.');
      return;
    }
    for (const it of items) {
      if (!it.productId || it.quantity <= 0) {
        setErrorMsg(`Invalid quantity for item "${it.productName}".`);
        return;
      }
    }

    try {
      setIsSubmitting(true);
      const cust = customers.find((c) => c.id === selectedCustomerId)!;

      const newSale: SaleInvoice = {
        id: `sale-${Date.now()}`,
        invoiceNumber: invoiceNumber.trim(),
        date,
        dueDate,
        customerId: cust.id,
        customerName: cust.name,
        customerPhone: cust.phone || '',
        customerAddress: cust.address || '',
        customerGstin: cust.gstin || '',
        customerState: cust.state || company.state,
        placeOfSupply,
        isInterstate,
        items,
        subtotal: Number(subtotal.toFixed(2)),
        itemDiscountTotal: 0,
        invoiceDiscount: Number(invoiceDiscount || 0),
        taxableAmount: Number(taxableAmount.toFixed(2)),
        cgstTotal: Number(cgstTotal.toFixed(2)),
        sgstTotal: Number(sgstTotal.toFixed(2)),
        igstTotal: Number(igstTotal.toFixed(2)),
        totalTax: Number(totalTax.toFixed(2)),
        roundOff,
        grandTotal,
        paymentStatus,
        paidAmount: Number(paidAmount || 0),
        balanceAmount,
        paymentMode,
        bankAccountId: paidAmount > 0 ? bankAccountId : undefined,
        notes,
        terms: company.termsAndConditions,
        financialYear: company.financialYear || '2026-27',
        createdAt: new Date().toISOString(),
      };

      await saveSaleInvoice(newSale);
      onSuccess(newSale);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save sale invoice.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-6xl max-h-[94vh] flex flex-col overflow-hidden my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold shadow-xs">
              +
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">New GST Sales Invoice</h2>
              <p className="text-xs text-slate-500">
                GST Auto-Engine: {isInterstate ? 'Interstate (IGST)' : 'Intrastate (CGST + SGST)'} • {company.state}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="overflow-y-auto p-4 sm:p-6 space-y-6">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs sm:text-sm text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Row 1: Invoice metadata & Customer selection */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-50/70 border border-slate-200 rounded-xl">
            {/* Customer Picker */}
            <div className="space-y-1.5 md:col-span-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Customer <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowAddCustomerInline(true)}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>+ New</span>
                </button>
              </div>

              {!showAddCustomerInline ? (
                <div>
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    className="w-full text-sm font-semibold rounded-xl border border-slate-300 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">-- Choose Customer --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.currentBalance > 0 ? `(Owes: ₹${c.currentBalance})` : ''}
                      </option>
                    ))}
                  </select>
                  {selectedCustomer && (
                    <div className="mt-2 text-xs text-slate-600 space-y-0.5 bg-white p-2.5 rounded-lg border border-slate-200">
                      <div className="flex justify-between">
                        <span className="text-slate-500">State:</span>
                        <span className="font-semibold">{selectedCustomer.state}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">GSTIN:</span>
                        <span className="font-mono">{selectedCustomer.gstin || 'Unregistered'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Current Balance:</span>
                        <span className="font-mono font-bold text-indigo-700">
                          {formatINR(selectedCustomer.currentBalance)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-3 bg-white border border-indigo-200 rounded-xl space-y-2">
                  <div className="text-xs font-bold text-indigo-900">Add Quick Customer</div>
                  <input
                    type="text"
                    placeholder="Customer / Firm Name"
                    value={newCustName}
                    onChange={(e) => setNewCustName(e.target.value)}
                    className="w-full text-xs rounded-lg border border-slate-300 p-2"
                  />
                  <input
                    type="text"
                    placeholder="Phone number"
                    value={newCustPhone}
                    onChange={(e) => setNewCustPhone(e.target.value)}
                    className="w-full text-xs rounded-lg border border-slate-300 p-2"
                  />
                  <input
                    type="text"
                    placeholder="GSTIN (optional)"
                    value={newCustGstin}
                    onChange={(e) => setNewCustGstin(e.target.value)}
                    className="w-full text-xs rounded-lg border border-slate-300 p-2 uppercase"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleCreateCustomerInline}
                      className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold"
                    >
                      Save & Select
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddCustomerInline(false)}
                      className="px-2 py-1.5 text-slate-500 text-xs"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Invoice Number & Date */}
            <div className="space-y-3 md:col-span-1">
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                  Invoice Number
                </label>
                <input
                  type="text"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  className="w-full text-sm font-mono font-bold rounded-xl border border-slate-300 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">Date</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full text-xs rounded-xl border border-slate-300 px-2 py-2 bg-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full text-xs rounded-xl border border-slate-300 px-2 py-2 bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Payment Terms & Place of Supply */}
            <div className="space-y-3 md:col-span-1">
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                  Payment Terms
                </label>
                <select
                  value={paymentTermsDays}
                  onChange={(e) => setPaymentTermsDays(Number(e.target.value))}
                  className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2 bg-white"
                >
                  <option value={0}>Due on Receipt (Immediate)</option>
                  <option value={7}>7 Days</option>
                  <option value={15}>15 Days</option>
                  <option value={30}>30 Days</option>
                  <option value={45}>45 Days</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                  Place of Supply
                </label>
                <div className="text-xs font-medium text-slate-800 bg-white border border-slate-200 px-3 py-2 rounded-xl flex items-center justify-between">
                  <span>{placeOfSupply}</span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isInterstate ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {isInterstate ? 'IGST' : 'CGST+SGST'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Item Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Invoice Items</h3>
              <button
                type="button"
                onClick={() => addItem()}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 rounded-xl text-xs font-bold transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>+ Add Product Row</span>
              </button>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <th className="py-2.5 px-3 min-w-[200px]">Product / Service</th>
                      <th className="py-2.5 px-2 text-center w-24">HSN</th>
                      <th className="py-2.5 px-2 text-center w-20">Qty</th>
                      <th className="py-2.5 px-2 text-center w-16">Unit</th>
                      <th className="py-2.5 px-2 text-right w-24">Rate (₹)</th>
                      <th className="py-2.5 px-2 text-right w-20">Disc %</th>
                      <th className="py-2.5 px-2 text-center w-20">GST %</th>
                      <th className="py-2.5 px-2 text-right w-24">Tax (₹)</th>
                      <th className="py-2.5 px-3 text-right w-28">Total (₹)</th>
                      <th className="py-2.5 px-2 text-center w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((it, idx) => (
                      <tr key={it.id} className="hover:bg-slate-50/60">
                        {/* Product Picker */}
                        <td className="py-2 px-3">
                          <select
                            value={it.productId}
                            onChange={(e) => handleProductSelect(idx, e.target.value)}
                            className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs font-medium bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          >
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} (Stock: {p.currentStock})
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* HSN */}
                        <td className="py-2 px-2 text-center">
                          <input
                            type="text"
                            value={it.hsn}
                            onChange={(e) => updateItem(idx, { hsn: e.target.value })}
                            className="w-full text-center font-mono rounded-lg border border-slate-300 px-1 py-1.5 text-xs"
                          />
                        </td>

                        {/* Quantity */}
                        <td className="py-2 px-2 text-center">
                          <input
                            type="number"
                            min="1"
                            value={it.quantity}
                            onChange={(e) => updateItem(idx, { quantity: Math.max(1, Number(e.target.value) || 1) })}
                            className="w-full text-center font-bold rounded-lg border border-slate-300 px-1 py-1.5 text-xs"
                          />
                        </td>

                        {/* Unit */}
                        <td className="py-2 px-2 text-center font-semibold text-slate-600">{it.unit}</td>

                        {/* Rate */}
                        <td className="py-2 px-2 text-right">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={it.rate}
                            onChange={(e) => updateItem(idx, { rate: Number(e.target.value) || 0 })}
                            className="w-full text-right font-mono font-medium rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
                          />
                        </td>

                        {/* Discount % */}
                        <td className="py-2 px-2 text-right">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={it.discountPercent}
                            onChange={(e) => updateItem(idx, { discountPercent: Number(e.target.value) || 0 })}
                            className="w-full text-right font-mono rounded-lg border border-slate-300 px-1 py-1.5 text-xs"
                          />
                        </td>

                        {/* GST % */}
                        <td className="py-2 px-2 text-center">
                          <select
                            value={it.gstRate}
                            onChange={(e) => updateItem(idx, { gstRate: Number(e.target.value) })}
                            className="w-full text-center font-mono font-semibold rounded-lg border border-slate-300 px-1 py-1.5 text-xs"
                          >
                            <option value={0}>0%</option>
                            <option value={5}>5%</option>
                            <option value={12}>12%</option>
                            <option value={18}>18%</option>
                            <option value={28}>28%</option>
                          </select>
                        </td>

                        {/* Tax Amount */}
                        <td className="py-2 px-2 text-right font-mono text-slate-700">
                          {formatINR(it.totalTax).replace('₹', '')}
                        </td>

                        {/* Total Amount */}
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                          {formatINR(it.totalAmount).replace('₹', '')}
                        </td>

                        {/* Delete Row */}
                        <td className="py-2 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => removeItem(idx)}
                            className="text-slate-400 hover:text-red-600 p-1 rounded transition-colors"
                            title="Remove row"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Row 3: Payment status & Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {/* Left: Payment execution & Notes */}
            <div className="space-y-4">
              <div className="p-4 border border-slate-200 rounded-xl bg-slate-50/60 space-y-3">
                <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Payment Collection Status
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {(['PAID', 'PARTIAL', 'UNPAID'] as PaymentStatus[]).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setPaymentStatus(st)}
                      className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                        paymentStatus === st
                          ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      {st === 'PAID' ? 'Full Paid' : st === 'PARTIAL' ? 'Partial Paid' : 'Credit / Unpaid'}
                    </button>
                  ))}
                </div>

                {paymentStatus !== 'UNPAID' && (
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="text-xs font-semibold text-slate-600 block mb-1">Amount Received (₹)</label>
                      <input
                        type="number"
                        min="0"
                        max={grandTotal}
                        value={paidAmount}
                        onChange={(e) => setPaidAmount(Number(e.target.value) || 0)}
                        className="w-full text-sm font-mono font-bold rounded-xl border border-slate-300 px-3 py-2 bg-white"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-600 block mb-1">Payment Mode</label>
                      <select
                        value={paymentMode}
                        onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}
                        className="w-full text-xs font-semibold rounded-xl border border-slate-300 px-3 py-2 bg-white"
                      >
                        <option value="BANK">Bank Transfer / IMPS</option>
                        <option value="UPI">UPI / QR Code</option>
                        <option value="CASH">Cash</option>
                        <option value="CARD">Debit / Credit Card</option>
                        <option value="CHEQUE">Cheque</option>
                      </select>
                    </div>

                    <div className="col-span-2">
                      <label className="text-xs font-semibold text-slate-600 block mb-1">Deposit Into Account</label>
                      <select
                        value={bankAccountId}
                        onChange={(e) => setBankAccountId(e.target.value)}
                        className="w-full text-xs font-semibold rounded-xl border border-slate-300 px-3 py-2 bg-white"
                      >
                        {bankAccounts.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.bankName} - {b.accountName} (Bal: ₹{b.currentBalance.toLocaleString()})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                  Customer Notes & Delivery Remarks
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-300 p-2.5 bg-white"
                  placeholder="Terms, dispatch details, courier tracking or warranty notes..."
                />
              </div>
            </div>

            {/* Right: Calculations breakdown card */}
            <div className="p-5 border border-slate-200 rounded-xl bg-slate-50 space-y-3">
              <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Invoice Summary</div>

              <div className="flex justify-between text-xs text-slate-600">
                <span>Subtotal (Before Tax):</span>
                <span className="font-mono font-medium">{formatINR(taxableAmount)}</span>
              </div>

              {isInterstate ? (
                <div className="flex justify-between text-xs text-slate-600">
                  <span>Integrated Tax (IGST):</span>
                  <span className="font-mono font-medium">{formatINR(igstTotal)}</span>
                </div>
              ) : (
                <>
                  <div className="flex justify-between text-xs text-slate-600">
                    <span>Central Tax (CGST):</span>
                    <span className="font-mono font-medium">{formatINR(cgstTotal)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-600">
                    <span>State Tax (SGST):</span>
                    <span className="font-mono font-medium">{formatINR(sgstTotal)}</span>
                  </div>
                </>
              )}

              <div className="flex justify-between items-center text-xs text-slate-600 pt-1">
                <span>Invoice Discount (₹):</span>
                <input
                  type="number"
                  min="0"
                  value={invoiceDiscount}
                  onChange={(e) => setInvoiceDiscount(Number(e.target.value) || 0)}
                  className="w-24 text-right font-mono text-xs rounded border border-slate-300 px-2 py-1 bg-white"
                />
              </div>

              <div className="flex justify-between items-center text-xs text-slate-600">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={roundOffEnabled}
                    onChange={(e) => setRoundOffEnabled(e.target.checked)}
                    className="rounded text-indigo-600"
                  />
                  <span>Round Off</span>
                </label>
                <span className="font-mono text-xs">{roundOff !== 0 ? (roundOff > 0 ? `+${roundOff}` : roundOff) : '0.00'}</span>
              </div>

              <div className="border-t border-slate-300 pt-3 flex justify-between items-center">
                <span className="text-sm font-bold text-slate-900">Grand Total:</span>
                <span className="text-xl font-black font-mono text-indigo-700">{formatINR(grandTotal)}</span>
              </div>

              <div className="border-t border-dashed border-slate-200 pt-2 flex justify-between text-xs font-semibold">
                <span className="text-emerald-700">Received Now:</span>
                <span className="font-mono text-emerald-800">{formatINR(paidAmount)}</span>
              </div>

              <div className="flex justify-between text-xs font-bold">
                <span className="text-red-600">Balance Receivable:</span>
                <span className="font-mono text-red-700">{formatINR(balanceAmount)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 hover:bg-slate-200 text-slate-700 rounded-xl text-xs sm:text-sm font-semibold transition-colors"
          >
            Cancel
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleSubmit}
              className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md transition-all"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? 'Saving...' : 'Save & Generate Invoice'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
