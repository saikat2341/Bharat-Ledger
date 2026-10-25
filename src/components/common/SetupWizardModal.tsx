import React, { useState } from 'react';
import {
  Building2,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  X,
  Sparkles,
  ShieldCheck,
  Check,
} from 'lucide-react';
import type { CompanyProfile } from '../../types';
import { INDIAN_STATES } from '../../utils/gst';
import { db } from '../../db';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  company: CompanyProfile;
  onComplete: () => void;
}

export const SetupWizardModal: React.FC<Props> = ({ isOpen, onClose, company, onComplete }) => {
  const [step, setStep] = useState(1);

  const [businessName, setBusinessName] = useState(company.businessName);
  const [address, setAddress] = useState(company.address);
  const [phone, setPhone] = useState(company.phone);
  const [email, setEmail] = useState(company.email);
  const [gstin, setGstin] = useState(company.gstin);
  const [state, setState] = useState(company.state);
  const [financialYear, setFinancialYear] = useState(company.financialYear || '2026-27');
  const [invoicePrefix, setInvoicePrefix] = useState(company.invoicePrefix || 'INV-2627-');
  const [invoiceStartNumber, setInvoiceStartNumber] = useState(company.invoiceStartNumber || 101);
  const [roundOffEnabled, setRoundOffEnabled] = useState(company.roundOffEnabled ?? true);

  const handleFinish = async () => {
    const matchedState = INDIAN_STATES.find((s) => s.name.toLowerCase() === state.toLowerCase());

    const updated: CompanyProfile = {
      ...company,
      businessName,
      address,
      phone,
      email,
      gstin: gstin.toUpperCase(),
      state,
      stateCode: matchedState?.code || '27',
      financialYear,
      invoicePrefix,
      invoiceStartNumber: Number(invoiceStartNumber) || 101,
      roundOffEnabled,
      isConfigured: true,
    };

    await db.company.put(updated);
    onComplete();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-indigo-300 font-bold">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">Company Setup Wizard</h2>
              <p className="text-xs text-indigo-200">Step {step} of 3 • Quick GST Business Configuration</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Progress Line */}
        <div className="h-1 bg-slate-100 flex">
          <div
            className="bg-indigo-600 transition-all duration-300"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Step 1: Business Identity & Contact</h3>
                <p className="text-xs text-slate-500">Enter your trade name and official business contacts.</p>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Business / Firm Name *</label>
                <input
                  type="text"
                  required
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g. Acme Electronics & Hardware"
                  className="w-full text-xs font-semibold rounded-xl border border-slate-300 p-2.5"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Business Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Street, locality, city"
                  className="w-full text-xs rounded-xl border border-slate-300 p-2.5"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98200 12345"
                    className="w-full text-xs rounded-xl border border-slate-300 p-2.5"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="accounts@business.in"
                    className="w-full text-xs rounded-xl border border-slate-300 p-2.5"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Step 2: GSTIN & State Jurisdiction</h3>
                <p className="text-xs text-slate-500">
                  GST rules automatically calculate CGST+SGST for intra-state and IGST for inter-state.
                </p>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">GSTIN (15 Digits)</label>
                <input
                  type="text"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value.toUpperCase())}
                  placeholder="e.g. 27AABCA1234F1Z5"
                  className="w-full text-xs font-mono font-bold rounded-xl border border-slate-300 p-2.5 uppercase"
                />
                <p className="text-[11px] text-slate-400 mt-1">Leave blank if unregistered composition dealer.</p>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Home State of Registration *</label>
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
                <label className="text-xs font-bold text-slate-700 block mb-1">Financial Year</label>
                <input
                  type="text"
                  value={financialYear}
                  onChange={(e) => setFinancialYear(e.target.value)}
                  className="w-full text-xs font-bold rounded-xl border border-slate-300 p-2.5"
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Step 3: Invoice Prefix & Defaults</h3>
                <p className="text-xs text-slate-500">Set up numbering series for your GST bills.</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
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
              </div>

              <div className="p-3.5 bg-slate-50 border rounded-xl text-xs space-y-2">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                  <input
                    type="checkbox"
                    checked={roundOffEnabled}
                    onChange={(e) => setRoundOffEnabled(e.target.checked)}
                    className="rounded text-indigo-600"
                  />
                  <span>Enable Auto Round Off for all bills</span>
                </label>
                <p className="text-slate-500 text-[11px]">
                  Automatically adjusts fractional paise to nearest rupee on grand totals.
                </p>
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>You can edit or update any of these settings at any time in Settings.</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          {step > 1 ? (
            <button
              onClick={() => setStep(step - 1)}
              className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 hover:bg-slate-200"
            >
              Back
            </button>
          ) : (
            <button onClick={onClose} className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-400">
              Skip
            </button>
          )}

          {step < 3 ? (
            <button
              onClick={() => setStep(step + 1)}
              className="flex items-center gap-1 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold"
            >
              <span>Next</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={handleFinish}
              className="flex items-center gap-1.5 px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow"
            >
              <Check className="w-4 h-4" />
              <span>Complete Setup</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
