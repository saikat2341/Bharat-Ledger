/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  db,
  initializeDatabase,
  DEFAULT_COMPANY,
  DEFAULT_BANK_ACCOUNTS,
} from './db';
import type {
  CompanyProfile,
  Customer,
  Supplier,
  Product,
  SaleInvoice,
  PurchaseInvoice,
  StockTransaction,
  PaymentRecord,
  BankAccount,
  Expense,
  JournalEntry,
} from './types';

// Layout
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';

// Views
import { Dashboard } from './components/dashboard/Dashboard';
import { SalesList } from './components/sales/SalesList';
import { PurchasesList } from './components/purchases/PurchasesList';
import { InventoryList } from './components/inventory/InventoryList';
import { CustomersList } from './components/customers/CustomersList';
import { SuppliersList } from './components/suppliers/SuppliersList';
import { AccountsView } from './components/accounts/AccountsView';
import { ReportsView } from './components/reports/ReportsView';
import { SettingsView } from './components/settings/SettingsView';
import { BackupRestoreView } from './components/backup/BackupRestoreView';

// Modals
import { CreateSaleModal } from './components/sales/CreateSaleModal';
import { CreatePurchaseModal } from './components/purchases/CreatePurchaseModal';
import { InvoicePDFModal } from './components/sales/InvoicePDFModal';
import { AccountingEffectModal } from './components/common/AccountingEffectModal';
import { CommandPalette } from './components/common/CommandPalette';
import { SetupWizardModal } from './components/common/SetupWizardModal';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Database Records in State
  const [company, setCompany] = useState<CompanyProfile>(DEFAULT_COMPANY);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<SaleInvoice[]>([]);
  const [purchases, setPurchases] = useState<PurchaseInvoice[]>([]);
  const [stockTransactions, setStockTransactions] = useState<StockTransaction[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>(DEFAULT_BANK_ACCOUNTS);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);

  // Modals & Drawers
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isCreateSaleOpen, setIsCreateSaleOpen] = useState(false);
  const [isCreatePurchaseOpen, setIsCreatePurchaseOpen] = useState(false);
  const [selectedInvoiceForPDF, setSelectedInvoiceForPDF] = useState<SaleInvoice | null>(null);
  const [selectedJournalForEffect, setSelectedJournalForEffect] = useState<JournalEntry | null>(null);
  const [isSetupWizardOpen, setIsSetupWizardOpen] = useState(false);

  // Toast notifications
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Fetch all tables from IndexedDB
  const refreshAllData = useCallback(async () => {
    try {
      await initializeDatabase();
      const comp = await db.company.get('default');
      if (comp) {
        setCompany(comp);
        if (!comp.isConfigured) {
          setIsSetupWizardOpen(true);
        }
      } else {
        setIsSetupWizardOpen(true);
      }

      const [cList, sList, pList, salesList, purList, stList, payList, bList, expList, jeList] =
        await Promise.all([
          db.customers.reverse().sortBy('createdAt'),
          db.suppliers.reverse().sortBy('createdAt'),
          db.products.reverse().sortBy('createdAt'),
          db.sales.reverse().sortBy('createdAt'),
          db.purchases.reverse().sortBy('createdAt'),
          db.stockTransactions.reverse().sortBy('createdAt'),
          db.payments.reverse().sortBy('createdAt'),
          db.bankAccounts.toArray(),
          db.expenses.reverse().sortBy('createdAt'),
          db.journalEntries.reverse().sortBy('createdAt'),
        ]);

      setCustomers(cList);
      setSuppliers(sList);
      setProducts(pList);
      setSales(salesList);
      setPurchases(purList);
      setStockTransactions(stList);
      setPayments(payList);
      setBankAccounts(bList);
      setExpenses(expList);
      setJournalEntries(jeList);
    } catch (err) {
      console.error('Failed to load database:', err);
    }
  }, []);

  // Initialize on mount
  useEffect(() => {
    refreshAllData();
  }, [refreshAllData]);

  // Global Keyboard Shortcuts (Ctrl + K, Ctrl + N, Esc)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+K or Cmd+K
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
      // Ctrl+N for New Sale
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setIsCreateSaleOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Command palette action dispatcher
  const handleCommandAction = (action: string, payload?: any) => {
    switch (action) {
      case 'NEW_SALE':
        setIsCreateSaleOpen(true);
        break;
      case 'NEW_PURCHASE':
        setIsCreatePurchaseOpen(true);
        break;
      case 'RECEIVE_MONEY':
        setActiveTab('accounts');
        break;
      case 'MAKE_PAYMENT':
        setActiveTab('accounts');
        break;
      case 'ADD_PRODUCT':
        setActiveTab('inventory');
        break;
      case 'ADD_CUSTOMER':
        setActiveTab('customers');
        break;
      case 'BACKUP_NOW':
        setActiveTab('backup');
        break;
      case 'NAVIGATE_INVENTORY':
        setActiveTab('inventory');
        break;
      case 'PREVIEW_INVOICE':
        if (payload) setSelectedInvoiceForPDF(payload);
        break;
      case 'VIEW_CUSTOMER_LEDGER':
        setActiveTab('customers');
        break;
      default:
        break;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row text-slate-900 font-sans antialiased">
      {/* Toast Notification Container */}
      {toastMessage && (
        <div className="toast-container fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl border border-slate-700 text-xs sm:text-sm font-semibold animate-in slide-in-from-bottom duration-200">
          {toastMessage}
        </div>
      )}

      {/* Desktop Persistent Sidebar */}
      <div className="hidden md:block">
        <Sidebar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          company={company}
        />
      </div>

      {/* Mobile Drawer Sidebar */}
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden bg-black/60">
          <div className="w-64 bg-white h-full shadow-2xl">
            <Sidebar
              activeTab={activeTab}
              onSelectTab={(t) => {
                setActiveTab(t);
                setIsMobileSidebarOpen(false);
              }}
              isCollapsed={false}
              onToggleCollapse={() => setIsMobileSidebarOpen(false)}
              company={company}
            />
          </div>
          <div className="flex-1" onClick={() => setIsMobileSidebarOpen(false)} />
        </div>
      )}

      {/* Main App Canvas */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <Header
          company={company}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
          onNewSaleClick={() => setIsCreateSaleOpen(true)}
          onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        />

        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto">
          {activeTab === 'dashboard' && (
            <Dashboard
              company={company}
              sales={sales}
              purchases={purchases}
              customers={customers}
              suppliers={suppliers}
              products={products}
              bankAccounts={bankAccounts}
              onNewSale={() => setIsCreateSaleOpen(true)}
              onNewPurchase={() => setIsCreatePurchaseOpen(true)}
              onReceiveMoney={() => setActiveTab('accounts')}
              onMakePayment={() => setActiveTab('accounts')}
              onAddCustomer={() => setActiveTab('customers')}
              onAddProduct={() => setActiveTab('inventory')}
              onViewInventory={() => setActiveTab('inventory')}
              onPreviewInvoice={(inv) => setSelectedInvoiceForPDF(inv)}
              onNavigateTab={(tab) => setActiveTab(tab)}
              onOpenSetup={() => setIsSetupWizardOpen(true)}
            />
          )}

          {activeTab === 'sales' && (
            <SalesList
              sales={sales}
              company={company}
              customers={customers}
              products={products}
              bankAccounts={bankAccounts}
              journalEntries={journalEntries}
              onNewSaleClick={() => setIsCreateSaleOpen(true)}
              onPreviewInvoice={(inv) => setSelectedInvoiceForPDF(inv)}
              onViewAccounting={(je) => setSelectedJournalForEffect(je)}
              onRefresh={refreshAllData}
            />
          )}

          {activeTab === 'purchases' && (
            <PurchasesList
              purchases={purchases}
              suppliers={suppliers}
              journalEntries={journalEntries}
              onNewPurchaseClick={() => setIsCreatePurchaseOpen(true)}
              onViewAccounting={(je) => setSelectedJournalForEffect(je)}
            />
          )}

          {activeTab === 'inventory' && (
            <InventoryList
              products={products}
              stockTransactions={stockTransactions}
              onRefresh={refreshAllData}
            />
          )}

          {activeTab === 'customers' && (
            <CustomersList
              customers={customers}
              sales={sales}
              payments={payments}
              bankAccounts={bankAccounts}
              onRefresh={refreshAllData}
              onNewSaleForCustomer={(custId) => {
                setIsCreateSaleOpen(true);
              }}
            />
          )}

          {activeTab === 'suppliers' && (
            <SuppliersList
              suppliers={suppliers}
              purchases={purchases}
              payments={payments}
              bankAccounts={bankAccounts}
              onRefresh={refreshAllData}
              onNewPurchaseForSupplier={(supId) => {
                setIsCreatePurchaseOpen(true);
              }}
            />
          )}

          {activeTab === 'accounts' && (
            <AccountsView
              bankAccounts={bankAccounts}
              expenses={expenses}
              journalEntries={journalEntries}
              payments={payments}
              customers={customers}
              suppliers={suppliers}
              onRefresh={refreshAllData}
              onViewAccounting={(je) => setSelectedJournalForEffect(je)}
            />
          )}

          {activeTab === 'reports' && (
            <ReportsView
              sales={sales}
              purchases={purchases}
              products={products}
              customers={customers}
              suppliers={suppliers}
              expenses={expenses}
              bankAccounts={bankAccounts}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView company={company} onRefresh={refreshAllData} />
          )}

          {activeTab === 'backup' && (
            <BackupRestoreView
              onRestoreComplete={() => {
                refreshAllData();
                showToast('Database successfully restored from backup.');
              }}
            />
          )}
        </main>
      </div>

      {/* Global Modals */}

      {/* Create Sale Modal */}
      {isCreateSaleOpen && (
        <CreateSaleModal
          isOpen={isCreateSaleOpen}
          onClose={() => setIsCreateSaleOpen(false)}
          company={company}
          customers={customers}
          products={products}
          bankAccounts={bankAccounts}
          onSuccess={(savedInvoice) => {
            setIsCreateSaleOpen(false);
            refreshAllData();
            showToast(`Invoice #${savedInvoice.invoiceNumber} saved successfully.`);
            setSelectedInvoiceForPDF(savedInvoice);
          }}
        />
      )}

      {/* Create Purchase Modal */}
      {isCreatePurchaseOpen && (
        <CreatePurchaseModal
          isOpen={isCreatePurchaseOpen}
          onClose={() => setIsCreatePurchaseOpen(false)}
          company={company}
          suppliers={suppliers}
          products={products}
          bankAccounts={bankAccounts}
          onSuccess={() => {
            setIsCreatePurchaseOpen(false);
            refreshAllData();
            showToast('Vendor purchase bill saved & stock replenished.');
          }}
        />
      )}

      {/* Invoice PDF & Print Preview Modal */}
      {Boolean(selectedInvoiceForPDF) && (
        <InvoicePDFModal
          invoice={selectedInvoiceForPDF}
          company={company}
          isOpen={Boolean(selectedInvoiceForPDF)}
          onClose={() => setSelectedInvoiceForPDF(null)}
        />
      )}

      {/* Double-Entry Accounting Effect Inspector Modal */}
      {Boolean(selectedJournalForEffect) && (
        <AccountingEffectModal
          entry={selectedJournalForEffect}
          isOpen={Boolean(selectedJournalForEffect)}
          onClose={() => setSelectedJournalForEffect(null)}
        />
      )}

      {/* Command Palette (Ctrl+K) */}
      {isCommandPaletteOpen && (
        <CommandPalette
          isOpen={isCommandPaletteOpen}
          onClose={() => setIsCommandPaletteOpen(false)}
          customers={customers}
          suppliers={suppliers}
          products={products}
          sales={sales}
          onSelectAction={handleCommandAction}
        />
      )}

      {/* Company First-time Setup Wizard */}
      {isSetupWizardOpen && (
        <SetupWizardModal
          isOpen={isSetupWizardOpen}
          onClose={() => setIsSetupWizardOpen(false)}
          company={company}
          onComplete={() => {
            refreshAllData();
            showToast('Company setup updated successfully.');
          }}
        />
      )}
    </div>
  );
}
