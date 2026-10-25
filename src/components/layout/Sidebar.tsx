import React from 'react';
import {
  LayoutDashboard,
  Receipt,
  Truck,
  Package,
  Users,
  Building2,
  Wallet,
  FileBarChart,
  Settings,
  Database,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import type { CompanyProfile } from '../../types';

interface Props {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  company: CompanyProfile;
}

export const Sidebar: React.FC<Props> = ({
  activeTab,
  onSelectTab,
  isCollapsed,
  onToggleCollapse,
  company,
}) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'sales', label: 'Sales & Invoices', icon: Receipt },
    { id: 'purchases', label: 'Purchases', icon: Truck },
    { id: 'inventory', label: 'Inventory', icon: Package },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'suppliers', label: 'Suppliers', icon: Building2 },
    { id: 'accounts', label: 'Accounts', icon: Wallet },
    { id: 'reports', label: 'Reports & GST', icon: FileBarChart },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside
      className={`no-print transition-all duration-200 border-r border-slate-200 bg-white flex flex-col justify-between shrink-0 h-screen sticky top-0 select-none ${
        isCollapsed ? 'w-16' : 'w-60'
      }`}
    >
      {/* Top Branding */}
      <div>
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-100">
          {!isCollapsed && (
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-extrabold text-sm shadow-xs shrink-0">
                BL
              </div>
              <div className="overflow-hidden">
                <div className="font-extrabold text-slate-900 text-sm tracking-tight truncate">
                  BharatLedger
                </div>
                <div className="text-[10px] text-slate-400 font-semibold truncate">
                  FY {company.financialYear || '2026-27'}
                </div>
              </div>
            </div>
          )}

          {isCollapsed && (
            <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-extrabold text-sm shadow-xs mx-auto">
              BL
            </div>
          )}

          <button
            onClick={onToggleCollapse}
            className={`p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors ${
              isCollapsed ? 'hidden' : 'block'
            }`}
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="p-2 space-y-1 mt-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                } ${isCollapsed ? 'justify-center px-0' : ''}`}
                title={isCollapsed ? item.label : undefined}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Section: Backup & Restore */}
      <div className="p-2 border-t border-slate-100 space-y-1">
        <button
          onClick={() => onSelectTab('backup')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
            activeTab === 'backup'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          } ${isCollapsed ? 'justify-center px-0' : ''}`}
          title="Backup & Restore"
        >
          <Database className="w-4 h-4 shrink-0 text-amber-500" />
          {!isCollapsed && <span>Backup & Restore</span>}
        </button>

        {!isCollapsed && (
          <div className="px-3 py-2 text-[10px] text-slate-400 flex items-center gap-1.5 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
            <span className="truncate">Local PC Storage</span>
          </div>
        )}

        {isCollapsed && (
          <button
            onClick={onToggleCollapse}
            className="w-full flex justify-center py-2 text-slate-400 hover:text-slate-700"
            title="Expand Sidebar"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </aside>
  );
};
