import React, { useState } from 'react';
import {
  Download,
  Upload,
  Database,
  CheckCircle2,
  AlertTriangle,
  HardDrive,
  ShieldCheck,
  FileCheck,
  Clock,
} from 'lucide-react';
import { exportDatabaseBackup, restoreDatabaseBackup } from '../../db';

interface Props {
  onRestoreComplete: () => void;
}

export const BackupRestoreView: React.FC<Props> = ({ onRestoreComplete }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [restoreStatus, setRestoreStatus] = useState<{ success?: boolean; message?: string } | null>(null);

  // Trigger Backup Download
  const handleBackupNow = async () => {
    try {
      setIsExporting(true);
      const json = await exportDatabaseBackup();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const dateStr = new Date().toISOString().slice(0, 10);
      const a = document.createElement('a');
      a.href = url;
      a.download = `BharatLedger_Database_Backup_${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert('Backup failed: ' + err.message);
    } finally {
      setIsExporting(false);
    }
  };

  // Handle Restore file upload
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm(`Are you sure you want to restore "${file.name}"? This will overwrite the current local database.`)) {
      e.target.value = '';
      return;
    }

    try {
      const text = await file.text();
      const res = await restoreDatabaseBackup(text);
      setRestoreStatus(res);
      if (res.success) {
        setTimeout(() => {
          onRestoreComplete();
        }, 1200);
      }
    } catch (err: any) {
      setRestoreStatus({ success: false, message: err.message || 'Corrupted file' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Database Backup & Recovery</h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Export complete financial data to safe offline JSON files, or restore an earlier snapshot.
          </p>
        </div>
      </div>

      {restoreStatus && (
        <div
          className={`p-4 rounded-2xl border text-xs sm:text-sm font-semibold flex items-center gap-2 ${
            restoreStatus.success
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {restoreStatus.success ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <AlertTriangle className="w-5 h-5 text-red-600" />}
          <span>{restoreStatus.message}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Backup Card */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-5 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
              <Download className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Create Full Database Backup</h2>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Downloads an unencrypted structured backup file containing all customers, suppliers, inventory items,
                GST invoices, stock logs, and double-entry accounting records.
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 border rounded-xl text-xs text-slate-600 space-y-1">
              <div className="font-bold text-slate-800">Backup Safeguards:</div>
              <div>• 100% offline & local - never sent over the internet</div>
              <div>• Includes complete relational schema integrity</div>
              <div>• File format: Structured JSON (.json)</div>
            </div>
          </div>

          <button
            disabled={isExporting}
            onClick={handleBackupNow}
            className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold shadow-md shadow-indigo-100 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>{isExporting ? 'Generating Backup File...' : 'Backup Now'}</span>
          </button>
        </div>

        {/* Restore Card */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-5 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Restore Existing Backup</h2>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Load a previously exported <code className="font-mono text-slate-700">.json</code> file to restore
                your company transactions, stock ledger, and party balances.
              </p>
            </div>

            <div className="p-3.5 bg-amber-50/60 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Notice on Restoring:</span>
              </div>
              <p>
                Restoring a backup will atomically replace the existing database records with the contents of the
                backup file.
              </p>
            </div>
          </div>

          <div>
            <label className="w-full flex items-center justify-center gap-2 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-bold shadow cursor-pointer transition-all">
              <Upload className="w-4 h-4" />
              <span>Select Backup File to Restore</span>
              <input type="file" accept=".json" onChange={handleFileChange} className="hidden" />
            </label>
          </div>
        </div>
      </div>

      {/* Security & Local-First Assurance */}
      <div className="p-5 bg-emerald-50/70 border border-emerald-200 rounded-2xl flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
        <div className="text-xs text-emerald-900 space-y-1">
          <span className="font-bold block">100% Local-First Business Architecture</span>
          <p className="leading-relaxed text-emerald-800">
            BharatLedger stores all business records in your local browser's IndexedDB engine. Your billing, client
            GSTINs, bank numbers, and accounting figures never leak to third-party cloud servers.
          </p>
        </div>
      </div>
    </div>
  );
};
