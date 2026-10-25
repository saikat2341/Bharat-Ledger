import React, { useState } from 'react';
import {
  Building2,
  Save,
  CheckCircle2,
  RotateCcw,
  Database,
  Lock,
  FileText,
  CreditCard,
  QrCode,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import type { CompanyProfile, UserAccount } from '../../types';
import { INDIAN_STATES } from '../../utils/gst';
import { db, resetDatabaseToClean } from '../../db';

interface Props {
  company: CompanyProfile;
  onRefresh: () => void;
}

export const SettingsView: React.FC<Props> = ({ company, onRefresh }) => {
  const [activeTab, setActiveTab] = useState<'PROFILE' | 'INVOICE' | 'MAINTENANCE'>('PROFILE');

  // Profile Form State
  const [businessName, setBusinessName] = useState(company.businessName);
  const [legalName, setLegalName] = useState(company.legalName);
  const [gstin, setGstin] = useState(company.gstin);
  const [pan, setPan] = useState(company.pan);
  const [phone, setPhone] = useState(company.phone);
  const [email, setEmail] = useState(company.email);
  const [address, setAddress] = useState(company.address);
  const [city, setCity] = useState(company.city);
  const [state, setState] = useState(company.state);
  const [pinCode, setPinCode] = useState(company.pinCode);
  const [bankName, setBankName] = useState(company.bankName);
  const [accountNumber, setAccountNumber] = useState(company.accountNumber);
  const [ifsc, setIfsc] = useState(company.ifsc);
  const [branch, setBranch] = useState(company.branch);
  const [upiId, setUpiId] = useState(company.upiId);

  // Billing Config State
  const [invoicePrefix, setInvoicePrefix] = useState(company.invoicePrefix);
  const [invoiceStartNumber, setInvoiceStartNumber] = useState(company.invoiceStartNumber);
  const [financialYear, setFinancialYear] = useState(company.financialYear);
  const [roundOffEnabled, setRoundOffEnabled] = useState(company.roundOffEnabled);
  const [termsAndConditions, setTermsAndConditions] = useState(company.termsAndConditions);
  const [notes, setNotes] = useState(company.notes);

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const matchedState = INDIAN_STATES.find((s) => s.name.toLowerCase() === state.toLowerCase());

    const updated: CompanyProfile = {
      ...company,
      businessName,
      legalName,
      gstin: gstin.toUpperCase(),
      pan: pan.toUpperCase(),
      phone,
      email,
      address,
      city,
      state,
      stateCode: matchedState?.code || '27',
      pinCode,
      bankName,
      accountNumber,
      ifsc: ifsc.toUpperCase(),
      branch,
      upiId,
      invoicePrefix,
      invoiceStartNumber: Number(invoiceStartNumber) || 1,
      financialYear,
      roundOffEnabled,
      termsAndConditions,
      notes,
      isConfigured: true,
    };

    await db.company.put(updated);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
    onRefresh();
  };

  const handleResetData = async () => {
    if (confirm('WARNING: Reset database to clean initial state? All your entered records and transactions will be cleared.')) {
      setIsResetting(true);
      await resetDatabaseToClean();
      setIsResetting(false);
      onRefresh();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Application & Business Settings</h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Configure your GST business profile, tax parameters, invoice branding, and local database maintenance.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-6 text-sm font-bold text-slate-500">
        {[
          { id: 'PROFILE', label: 'Business Profile & Bank Details' },
          { id: 'INVOICE', label: 'Invoice & GST Billing Preferences' },
          { id: 'MAINTENANCE', label: 'Database Maintenance & Reset' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`pb-3 border-b-2 transition-all cursor-pointer ${
              activeTab === tab.id
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {savedSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Business profile and settings saved successfully to local database.</span>
        </div>
      )}

      {/* Profile Tab */}
      {activeTab === 'PROFILE' && (
        <form onSubmit={handleSaveProfile} className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Business Identity</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Trade / Business Name *</label>
                <input
                  type="text"
                  required
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="w-full text-xs font-semibold rounded-xl border border-slate-300 p-2.5"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Legal Entity Name</label>
                <input
                  type="text"
                  value={legalName}
                  onChange={(e) => setLegalName(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-300 p-2.5"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">GSTIN (15 Digits)</label>
                <input
                  type="text"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value.toUpperCase())}
                  className="w-full text-xs font-mono font-bold rounded-xl border border-slate-300 p-2.5 uppercase"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Income Tax PAN</label>
                <input
                  type="text"
                  value={pan}
                  onChange={(e) => setPan(e.target.value.toUpperCase())}
                  className="w-full text-xs font-mono font-bold rounded-xl border border-slate-300 p-2.5 uppercase"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Contact Phone</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-300 p-2.5"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Official Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-300 p-2.5"
                />
              </div>
            </div>

            <div className="pt-2">
              <label className="text-xs font-bold text-slate-700 block mb-1">Business Address</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full text-xs rounded-xl border border-slate-300 p-2.5"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">City</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-300 p-2.5"
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

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">PIN Code</label>
                <input
                  type="text"
                  value={pinCode}
                  onChange={(e) => setPinCode(e.target.value)}
                  className="w-full text-xs font-mono rounded-xl border border-slate-300 p-2.5"
                />
              </div>
            </div>
          </div>

          {/* Bank & Settlement Details for Invoices */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Bank Details (Printed on Invoices)
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Bank Name</label>
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-300 p-2.5"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Account Number</label>
                <input
                  type="text"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  className="w-full text-xs font-mono font-bold rounded-xl border border-slate-300 p-2.5"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">IFSC Code</label>
                <input
                  type="text"
                  value={ifsc}
                  onChange={(e) => setIfsc(e.target.value.toUpperCase())}
                  className="w-full text-xs font-mono font-bold rounded-xl border border-slate-300 p-2.5 uppercase"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Branch Name</label>
                <input
                  type="text"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-300 p-2.5"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">UPI ID for Direct QR Collection</label>
                <input
                  type="text"
                  placeholder="name@bank"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  className="w-full text-xs font-mono rounded-xl border border-slate-300 p-2.5"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md"
            >
              <Save className="w-4 h-4" />
              <span>Save Business Profile</span>
            </button>
          </div>
        </form>
      )}

      {/* Invoice Settings Tab */}
      {activeTab === 'INVOICE' && (
        <form onSubmit={handleSaveProfile} className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Invoice Numbering & Layout</h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Invoice Prefix</label>
                <input
                  type="text"
                  value={invoicePrefix}
                  onChange={(e) => setInvoicePrefix(e.target.value)}
                  className="w-full text-xs font-mono font-bold rounded-xl border border-slate-300 p-2.5"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Starting Number</label>
                <input
                  type="number"
                  value={invoiceStartNumber}
                  onChange={(e) => setInvoiceStartNumber(Number(e.target.value) || 1)}
                  className="w-full text-xs font-mono font-bold rounded-xl border border-slate-300 p-2.5"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Financial Year</label>
                <input
                  type="text"
                  value={financialYear}
                  onChange={(e) => setFinancialYear(e.target.value)}
                  className="w-full text-xs font-bold rounded-xl border border-slate-300 p-2.5"
                />
              </div>
            </div>

            <div className="pt-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
                <input
                  type="checkbox"
                  checked={roundOffEnabled}
                  onChange={(e) => setRoundOffEnabled(e.target.checked)}
                  className="rounded text-indigo-600"
                />
                <span>Enable Automatic Round Off to Nearest Rupee</span>
              </label>
            </div>

            <div className="pt-2">
              <label className="text-xs font-bold text-slate-700 block mb-1">Standard Terms & Conditions</label>
              <textarea
                rows={3}
                value={termsAndConditions}
                onChange={(e) => setTermsAndConditions(e.target.value)}
                className="w-full text-xs rounded-xl border border-slate-300 p-2.5"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Default Invoice Notes / Greeting</label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full text-xs rounded-xl border border-slate-300 p-2.5"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md"
            >
              <Save className="w-4 h-4" />
              <span>Save Invoice Preferences</span>
            </button>
          </div>
        </form>
      )}

      {/* Database Maintenance & Reset Tab */}
      {activeTab === 'MAINTENANCE' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Local Offline Database Status</h3>
                <p className="text-xs text-slate-500">
                  All accounting data, customers, inventory, and invoices are stored 100% locally on your computer inside IndexedDB.
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 space-y-2">
              <div className="font-semibold text-slate-800">Local-First Architecture Details:</div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Zero external cloud storage required for everyday billing and stock management.</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Database engine: Dexie.js / IndexedDB (`BharatLedgerDatabase`) with transactional integrity.</span>
              </div>
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-600" />
                <span>Use the <strong>Backup & Restore</strong> menu in the sidebar to download full offline JSON snapshots at any time.</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-red-200 shadow-2xs space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Clear All Data (Factory Reset)</h3>
                <p className="text-xs text-slate-500">
                  Resets the database to a completely blank slate. All sales, purchases, customer ledgers, and inventory will be wiped clean.
                </p>
              </div>
            </div>

            <div className="p-3 bg-red-50/70 border border-red-100 rounded-xl text-xs text-red-700">
              Note: This action is permanent and cannot be undone unless you have created an offline JSON backup file.
            </div>

            <button
              disabled={isResetting}
              onClick={handleResetData}
              className="px-5 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-bold shadow cursor-pointer transition-colors"
            >
              {isResetting ? 'Resetting Database...' : 'Reset Database to Clean State'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
