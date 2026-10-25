import React, { useState } from 'react';
import {
  Plus,
  Search,
  AlertTriangle,
  Package,
  Layers,
  History,
  TrendingDown,
  TrendingUp,
  X,
  CheckCircle,
  Save,
} from 'lucide-react';
import type { Product, StockTransaction } from '../../types';
import { formatINR } from '../../utils/gst';
import { db, recordStockAdjustment } from '../../db';

interface Props {
  products: Product[];
  stockTransactions: StockTransaction[];
  onRefresh: () => void;
}

export const InventoryList: React.FC<Props> = ({ products, stockTransactions, onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Modals
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [selectedProductForLedger, setSelectedProductForLedger] = useState<Product | null>(null);

  // Add Product Form State
  const [newProdName, setNewProdName] = useState('');
  const [newProdSku, setNewProdSku] = useState('');
  const [newProdBarcode, setNewProdBarcode] = useState('');
  const [newProdCategory, setNewProdCategory] = useState('General');
  const [newProdHsn, setNewProdHsn] = useState('');
  const [newProdUnit, setNewProdUnit] = useState('PCS');
  const [newProdPurchasePrice, setNewProdPurchasePrice] = useState<number>(0);
  const [newProdSellingPrice, setNewProdSellingPrice] = useState<number>(0);
  const [newProdGstRate, setNewProdGstRate] = useState(18);
  const [newProdOpeningStock, setNewProdOpeningStock] = useState<number>(0);
  const [newProdMinStock, setNewProdMinStock] = useState<number>(5);
  const [newProdDesc, setNewProdDesc] = useState('');

  // Stock Adjust Form State
  const [adjustProdId, setAdjustProdId] = useState('');
  const [adjustType, setAdjustType] = useState<'ADJUSTMENT_ADD' | 'ADJUSTMENT_REMOVE'>('ADJUSTMENT_REMOVE');
  const [adjustQty, setAdjustQty] = useState(1);
  const [adjustReason, setAdjustReason] = useState('Damaged in transit');

  // Filtered products
  const filtered = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.hsn && p.hsn.includes(searchTerm));

    const status =
      p.currentStock <= 0 ? 'OUT_OF_STOCK' : p.currentStock <= p.minStockAlert ? 'LOW_STOCK' : 'IN_STOCK';

    const matchesStatus = filterStatus === 'ALL' || status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  // KPI Calculations
  const totalStockValue = products.reduce((sum, p) => sum + p.currentStock * p.purchasePrice, 0);
  const lowStockCount = products.filter((p) => p.currentStock > 0 && p.currentStock <= p.minStockAlert).length;
  const outOfStockCount = products.filter((p) => p.currentStock <= 0).length;

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdName.trim()) return;

    const newProd: Product = {
      id: `prod-${Date.now()}`,
      name: newProdName.trim(),
      sku: newProdSku.trim() || `SKU-${Date.now().toString().slice(-4)}`,
      barcode: newProdBarcode.trim(),
      category: newProdCategory,
      brand: 'General',
      hsn: newProdHsn.trim(),
      unit: newProdUnit,
      purchasePrice: Number(newProdPurchasePrice),
      sellingPrice: Number(newProdSellingPrice),
      mrp: Number(newProdSellingPrice) * 1.15,
      gstRate: Number(newProdGstRate),
      openingStock: Number(newProdOpeningStock),
      currentStock: Number(newProdOpeningStock),
      minStockAlert: Number(newProdMinStock),
      maxStock: 100,
      description: newProdDesc,
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    await db.products.add(newProd);

    // If opening stock > 0, log transaction
    if (newProd.openingStock > 0) {
      await db.stockTransactions.add({
        id: `st-init-${Date.now()}`,
        productId: newProd.id,
        productName: newProd.name,
        date: new Date().toISOString().slice(0, 10),
        type: 'OPENING',
        quantity: newProd.openingStock,
        unitPrice: newProd.purchasePrice,
        notes: 'Initial Opening Stock Balance',
        balanceAfter: newProd.openingStock,
        createdAt: new Date().toISOString(),
      });
    }

    setShowAddProductModal(false);
    onRefresh();
  };

  const handleStockAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustProdId || adjustQty <= 0) return;

    try {
      await recordStockAdjustment(adjustProdId, adjustQty, adjustType, adjustReason);
      setShowAdjustModal(false);
      setAdjustQty(1);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Error updating stock');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Inventory & Stock Master</h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Real-time stock ledger, HSN code database, low stock thresholds, and inventory valuation.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setAdjustProdId(products[0]?.id || '');
              setShowAdjustModal(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs sm:text-sm font-bold border border-slate-200 transition-colors cursor-pointer"
          >
            <span>± Stock Adjustment</span>
          </button>
          <button
            onClick={() => setShowAddProductModal(true)}
            className="flex items-center gap-1.5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-indigo-100 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Product</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            Total Products
          </span>
          <div className="text-xl sm:text-2xl font-black font-mono text-slate-900">{products.length}</div>
          <p className="text-[11px] text-slate-400 mt-1">Catalog items tracked</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            Inventory Valuation (Cost)
          </span>
          <div className="text-xl sm:text-2xl font-black font-mono text-emerald-700">{formatINR(totalStockValue)}</div>
          <p className="text-[11px] text-slate-400 mt-1">Based on purchase rate</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            Low Stock Alerts
          </span>
          <div className="text-xl sm:text-2xl font-black font-mono text-amber-600">{lowStockCount}</div>
          <p className="text-[11px] text-slate-400 mt-1">Approaching reorder level</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            Out of Stock
          </span>
          <div className="text-xl sm:text-2xl font-black font-mono text-rose-600">{outOfStockCount}</div>
          <p className="text-[11px] text-slate-400 mt-1">Zero units remaining</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search product name, SKU or HSN code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto">
          {[
            { id: 'ALL', label: 'All Items' },
            { id: 'IN_STOCK', label: 'In Stock' },
            { id: 'LOW_STOCK', label: `Low Stock (${lowStockCount})` },
            { id: 'OUT_OF_STOCK', label: `Out of Stock (${outOfStockCount})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterStatus(tab.id)}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl whitespace-nowrap transition-all cursor-pointer ${
                filterStatus === tab.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Product Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase">
                <th className="py-3 px-4">Item Details</th>
                <th className="py-3 px-3 text-center">HSN</th>
                <th className="py-3 px-3 text-right">Cost (₹)</th>
                <th className="py-3 px-3 text-right">Selling (₹)</th>
                <th className="py-3 px-2 text-center">GST %</th>
                <th className="py-3 px-3 text-center">Stock</th>
                <th className="py-3 px-4 text-right">Valuation</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-4 text-center">Audit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
              {filtered.map((p) => {
                const isOutOfStock = p.currentStock <= 0;
                const isLowStock = !isOutOfStock && p.currentStock <= p.minStockAlert;
                const stockVal = p.currentStock * p.purchasePrice;

                return (
                  <tr key={p.id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{p.name}</div>
                      <div className="text-[11px] text-slate-500 font-mono flex items-center gap-2">
                        <span>SKU: {p.sku}</span>
                        {p.category && <span>• {p.category}</span>}
                      </div>
                    </td>

                    <td className="py-3 px-3 text-center font-mono text-slate-600">{p.hsn || '-'}</td>

                    <td className="py-3 px-3 text-right font-mono text-slate-600">{formatINR(p.purchasePrice)}</td>

                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                      {formatINR(p.sellingPrice)}
                    </td>

                    <td className="py-3 px-2 text-center font-mono font-semibold">{p.gstRate}%</td>

                    <td className="py-3 px-3 text-center font-mono font-black text-sm">
                      <span className={isOutOfStock ? 'text-rose-600' : isLowStock ? 'text-amber-600' : 'text-slate-800'}>
                        {p.currentStock} {p.unit}
                      </span>
                      {isLowStock && (
                        <div className="text-[10px] text-amber-600 font-normal">Min: {p.minStockAlert}</div>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right font-mono font-semibold text-slate-900">
                      {formatINR(stockVal)}
                    </td>

                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                          isOutOfStock
                            ? 'bg-rose-100 text-rose-800'
                            : isLowStock
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {isOutOfStock ? 'Out of Stock' : isLowStock ? 'Low Stock' : 'In Stock'}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => setSelectedProductForLedger(p)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                        title="View Product Stock Movement Ledger"
                      >
                        <History className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-14 text-center">
                    <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
                      <Package className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-bold text-slate-800">No Products in Inventory</p>
                    <p className="text-xs text-slate-500 mt-1 mb-4">
                      {searchTerm ? 'No products matched your search query.' : 'Add your items with HSN codes, cost, selling prices, and GST rates.'}
                    </p>
                    {!searchTerm && (
                      <button
                        onClick={() => setShowAddProductModal(true)}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                      >
                        + Add First Product
                      </button>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stock Ledger Drawer / Modal */}
      {selectedProductForLedger && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">{selectedProductForLedger.name}</h3>
                  <p className="text-xs text-slate-500">
                    Stock Ledger • Current Stock: {selectedProductForLedger.currentStock} {selectedProductForLedger.unit}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedProductForLedger(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto p-4 sm:p-6">
              {stockTransactions.filter((st) => st.productId === selectedProductForLedger.id).length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs">
                  No stock transactions recorded yet for this product.
                </div>
              ) : (
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold border-b">
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3">Reference / Remarks</th>
                      <th className="py-2.5 px-3 text-right">In / Out</th>
                      <th className="py-2.5 px-3 text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {stockTransactions
                      .filter((st) => st.productId === selectedProductForLedger.id)
                      .map((st) => {
                        const isIncrease =
                          st.type === 'PURCHASE' || st.type === 'SALE_RETURN' || st.type === 'ADJUSTMENT_ADD' || st.type === 'OPENING';
                        return (
                          <tr key={st.id} className="hover:bg-slate-50/70">
                            <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">{st.date}</td>
                            <td className="py-2.5 px-3 font-semibold">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  isIncrease ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                                }`}
                              >
                                {st.type}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-slate-700">{st.notes || st.referenceNumber || '-'}</td>
                            <td
                              className={`py-2.5 px-3 text-right font-mono font-bold ${
                                isIncrease ? 'text-emerald-700' : 'text-rose-700'
                              }`}
                            >
                              {isIncrease ? `+${st.quantity}` : `-${st.quantity}`}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                              {st.balanceAfter}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              )}
            </div>

            <div className="px-6 py-3 border-t bg-slate-50 flex justify-end">
              <button
                onClick={() => setSelectedProductForLedger(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Product Modal */}
      {showAddProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b bg-slate-50">
              <h3 className="font-bold text-slate-900 text-base">Add New Product</h3>
              <button onClick={() => setShowAddProductModal(false)} className="p-1 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="overflow-y-auto p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Product Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SanDisk 128GB Ultra USB 3.0 Pen Drive"
                  value={newProdName}
                  onChange={(e) => setNewProdName(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-300 p-2.5"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">SKU / Item Code</label>
                  <input
                    type="text"
                    placeholder="e.g. SND-128-USB"
                    value={newProdSku}
                    onChange={(e) => setNewProdSku(e.target.value)}
                    className="w-full text-xs rounded-xl border border-slate-300 p-2.5 font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">HSN/SAC Code</label>
                  <input
                    type="text"
                    placeholder="e.g. 85235100"
                    value={newProdHsn}
                    onChange={(e) => setNewProdHsn(e.target.value)}
                    className="w-full text-xs rounded-xl border border-slate-300 p-2.5 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Purchase Rate (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={newProdPurchasePrice}
                    onChange={(e) => setNewProdPurchasePrice(Number(e.target.value) || 0)}
                    className="w-full text-xs rounded-xl border border-slate-300 p-2.5 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Selling Rate (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={newProdSellingPrice}
                    onChange={(e) => setNewProdSellingPrice(Number(e.target.value) || 0)}
                    className="w-full text-xs rounded-xl border border-slate-300 p-2.5 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">GST Rate %</label>
                  <select
                    value={newProdGstRate}
                    onChange={(e) => setNewProdGstRate(Number(e.target.value))}
                    className="w-full text-xs rounded-xl border border-slate-300 p-2.5 font-semibold bg-white"
                  >
                    <option value={0}>0%</option>
                    <option value={5}>5%</option>
                    <option value={12}>12%</option>
                    <option value={18}>18%</option>
                    <option value={28}>28%</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Unit</label>
                  <select
                    value={newProdUnit}
                    onChange={(e) => setNewProdUnit(e.target.value)}
                    className="w-full text-xs rounded-xl border border-slate-300 p-2.5 bg-white font-semibold"
                  >
                    <option value="PCS">PCS (Pieces)</option>
                    <option value="SET">SET (Sets)</option>
                    <option value="BOX">BOX (Boxes)</option>
                    <option value="PKT">PKT (Packets)</option>
                    <option value="KG">KG (Kilograms)</option>
                    <option value="MTR">MTR (Meters)</option>
                    <option value="LTR">LTR (Liters)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Opening Stock</label>
                  <input
                    type="number"
                    min="0"
                    value={newProdOpeningStock}
                    onChange={(e) => setNewProdOpeningStock(Number(e.target.value) || 0)}
                    className="w-full text-xs rounded-xl border border-slate-300 p-2.5 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Min Alert Stock</label>
                  <input
                    type="number"
                    min="0"
                    value={newProdMinStock}
                    onChange={(e) => setNewProdMinStock(Number(e.target.value) || 0)}
                    className="w-full text-xs rounded-xl border border-slate-300 p-2.5 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowAddProductModal(false)}
                  className="px-4 py-2 border rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold"
                >
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock Adjustment Modal */}
      {showAdjustModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-slate-900 text-base">Record Stock Adjustment</h3>
              <button onClick={() => setShowAdjustModal(false)} className="p-1 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleStockAdjustment} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Select Product</label>
                <select
                  value={adjustProdId}
                  onChange={(e) => setAdjustProdId(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-300 p-2.5 bg-white font-medium"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Current: {p.currentStock} {p.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Adjustment Action</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustType('ADJUSTMENT_REMOVE')}
                    className={`p-2 text-xs font-bold rounded-xl border ${
                      adjustType === 'ADJUSTMENT_REMOVE'
                        ? 'bg-rose-50 border-rose-300 text-rose-700'
                        : 'bg-white border-slate-200 text-slate-700'
                    }`}
                  >
                    - Reduce Stock (Damaged/Lost)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustType('ADJUSTMENT_ADD')}
                    className={`p-2 text-xs font-bold rounded-xl border ${
                      adjustType === 'ADJUSTMENT_ADD'
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                        : 'bg-white border-slate-200 text-slate-700'
                    }`}
                  >
                    + Increase Stock (Found/Surplus)
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Quantity</label>
                <input
                  type="number"
                  min="1"
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(Number(e.target.value) || 1)}
                  className="w-full text-xs rounded-xl border border-slate-300 p-2.5 font-mono font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Reason / Audit Trail Note</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Physical stock count discrepancy, water damage..."
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-300 p-2.5"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdjustModal(false)}
                  className="px-4 py-2 border rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold"
                >
                  Commit Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
