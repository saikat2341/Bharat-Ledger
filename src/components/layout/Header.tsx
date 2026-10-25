import React from 'react';
import {
  Search,
  Plus,
  HardDrive,
  Menu,
  ShieldCheck,
  Building,
} from 'lucide-react';
import type { CompanyProfile } from '../../types';

interface Props {
  company: CompanyProfile;
  onOpenCommandPalette: () => void;
  onNewSaleClick: () => void;
  onToggleMobileSidebar: () => void;
}

export const Header: React.FC<Props> = ({
  company,
  onOpenCommandPalette,
  onNewSaleClick,
  onToggleMobileSidebar,
}) => {
  return (
    <header className="no-print h-16 bg-white border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobileSidebar}
          className="md:hidden p-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-xl border border-slate-200 text-xs">
          <Building className="w-3.5 h-3.5 text-slate-500" />
          <span className="font-bold text-slate-800 truncate max-w-[220px]">{company.businessName || 'Business Setup Pending'}</span>
          <span className="text-slate-400 font-mono text-[11px]">({company.state || 'India'})</span>
        </div>
      </div>

      {/* Center Search Palette trigger */}
      <div className="flex-1 max-w-md mx-4">
        <button
          onClick={onOpenCommandPalette}
          className="w-full flex items-center justify-between px-3.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-100 text-slate-400 hover:text-slate-600 text-xs transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <span>Search or jump to... (Ctrl + K)</span>
          </div>
          <kbd className="hidden sm:inline-block font-mono text-[10px] font-bold bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-500">
            Ctrl+K
          </kbd>
        </button>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-3">
        {/* Offline local indicator */}
        <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-500 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-[11px] font-semibold text-emerald-800">Offline & Local SQLite/IDB</span>
        </div>

        {/* Primary New Sale button */}
        <button
          onClick={onNewSaleClick}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Sale</span>
        </button>
      </div>
    </header>
  );
};
