import React, { useState, useEffect } from 'react';
import {
  Search,
  Plus,
  FileText,
  Users,
  Package,
  ShoppingBag,
  ArrowDownLeft,
  ArrowUpRight,
  Database,
  X,
  Printer,
} from 'lucide-react';
import type { Customer, Supplier, Product, SaleInvoice } from '../../types';
import { formatINR } from '../../utils/gst';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  suppliers: Supplier[];
  products: Product[];
  sales: SaleInvoice[];
  onSelectAction: (action: string, payload?: any) => void;
}

export const CommandPalette: React.FC<Props> = ({
  isOpen,
  onClose,
  customers,
  suppliers,
  products,
  sales,
  onSelectAction,
}) => {
  const [query, setQuery] = useState('');

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const q = query.trim().toLowerCase();

  const matchedActions = [
    { id: 'NEW_SALE', label: 'Create New Sale Invoice', icon: Plus, category: 'Action' },
    { id: 'NEW_PURCHASE', label: 'Record Vendor Purchase Bill', icon: ShoppingBag, category: 'Action' },
    { id: 'RECEIVE_MONEY', label: 'Receive Payment from Customer', icon: ArrowDownLeft, category: 'Action' },
    { id: 'MAKE_PAYMENT', label: 'Make Payment to Supplier', icon: ArrowUpRight, category: 'Action' },
    { id: 'ADD_PRODUCT', label: 'Add New Product to Inventory', icon: Package, category: 'Action' },
    { id: 'ADD_CUSTOMER', label: 'Add New Customer', icon: Users, category: 'Action' },
    { id: 'BACKUP_NOW', label: 'Download Database Backup', icon: Database, category: 'Action' },
  ].filter((a) => !q || a.label.toLowerCase().includes(q));

  const matchedCustomers = customers
    .filter((c) => !q || c.name.toLowerCase().includes(q) || c.phone.includes(q))
    .slice(0, 4);

  const matchedProducts = products
    .filter((p) => !q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.hsn.includes(q))
    .slice(0, 4);

  const matchedSales = sales
    .filter((s) => !q || s.invoiceNumber.toLowerCase().includes(q) || s.customerName.toLowerCase().includes(q))
    .slice(0, 4);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
        {/* Search Input */}
        <div className="flex items-center px-4 py-3 border-b border-slate-200 bg-slate-50/70 gap-3">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            autoFocus
            type="text"
            placeholder="Search invoices, customers, products or commands... (Ctrl+K)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full text-sm font-medium bg-transparent focus:outline-none text-slate-900 placeholder:text-slate-400"
          />
          <kbd className="px-2 py-0.5 text-[10px] font-mono font-bold bg-slate-200 text-slate-600 rounded">ESC</kbd>
        </div>

        {/* Results Body */}
        <div className="max-h-96 overflow-y-auto p-3 space-y-4 text-xs">
          {/* Quick Commands */}
          {matchedActions.length > 0 && (
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 block mb-1">
                Quick Commands
              </span>
              <div className="space-y-0.5">
                {matchedActions.map((act) => {
                  const Icon = act.icon;
                  return (
                    <button
                      key={act.id}
                      onClick={() => {
                        onSelectAction(act.id);
                        onClose();
                      }}
                      className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-indigo-50 hover:text-indigo-900 text-slate-700 transition-colors text-left"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="font-semibold">{act.label}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 uppercase">Action</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Customers */}
          {matchedCustomers.length > 0 && (
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 block mb-1">
                Customers
              </span>
              <div className="space-y-0.5">
                {matchedCustomers.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      onSelectAction('VIEW_CUSTOMER_LEDGER', c);
                      onClose();
                    }}
                    className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-slate-100 text-slate-700 transition-colors text-left"
                  >
                    <div>
                      <div className="font-bold text-slate-900">{c.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {c.phone || c.city || 'Customer'} • {c.gstin || 'Unregistered'}
                      </div>
                    </div>
                    <span className="font-mono font-bold text-indigo-700">
                      {c.currentBalance > 0 ? `Owes ${formatINR(c.currentBalance)}` : 'Clear'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Products */}
          {matchedProducts.length > 0 && (
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 block mb-1">
                Products & Inventory
              </span>
              <div className="space-y-0.5">
                {matchedProducts.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      onSelectAction('NAVIGATE_INVENTORY');
                      onClose();
                    }}
                    className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-slate-100 text-slate-700 transition-colors text-left"
                  >
                    <div>
                      <div className="font-bold text-slate-900">{p.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        SKU: {p.sku} • HSN: {p.hsn}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-bold text-slate-900">{formatINR(p.sellingPrice)}</div>
                      <span className="text-[10px] text-slate-500">
                        Stock: {p.currentStock} {p.unit}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Invoices */}
          {matchedSales.length > 0 && (
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 block mb-1">
                Recent Invoices
              </span>
              <div className="space-y-0.5">
                {matchedSales.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      onSelectAction('PREVIEW_INVOICE', s);
                      onClose();
                    }}
                    className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-slate-100 text-slate-700 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2">
                      <Printer className="w-4 h-4 text-slate-400" />
                      <div>
                        <span className="font-mono font-bold text-indigo-700">{s.invoiceNumber}</span>
                        <div className="text-[10px] text-slate-500">{s.customerName}</div>
                      </div>
                    </div>
                    <span className="font-mono font-bold text-slate-900">{formatINR(s.grandTotal)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <span>Press ESC to exit</span>
          <span>Tip: Press Ctrl + K anywhere</span>
        </div>
      </div>
    </div>
  );
};
