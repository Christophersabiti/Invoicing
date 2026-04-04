'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import {
  LayoutDashboard, Users, FolderOpen, Tag, FileText,
  CreditCard, BarChart2, Settings, UserCog, Building2,
  Wallet, Receipt, Palette, ChevronDown, ChevronRight,
} from 'lucide-react';
import { useState } from 'react';

const mainNav = [
  { label: 'Dashboard', href: '/',         icon: LayoutDashboard },
  { label: 'Clients',   href: '/clients',  icon: Users },
  { label: 'Projects',  href: '/projects', icon: FolderOpen },
  { label: 'Services',  href: '/services', icon: Tag },
  { label: 'Invoices',  href: '/invoices', icon: FileText },
  { label: 'Payments',  href: '/payments', icon: CreditCard },
  { label: 'Reports',   href: '/reports',  icon: BarChart2 },
];

const settingsNav = [
  { label: 'Company Profile',  href: '/admin/settings/company',         icon: Building2 },
  { label: 'Payment Methods',  href: '/admin/settings/payment-methods', icon: Wallet },
  { label: 'Invoice Settings', href: '/admin/settings/invoice',         icon: Receipt },
  { label: 'Branding',         href: '/admin/settings/branding',        icon: Palette },
];

const adminNav = [
  { label: 'Users',       href: '/admin/users', icon: UserCog },
];

export function Sidebar() {
  const pathname = usePathname();
  const isInSettings = pathname.startsWith('/admin/settings');
  const isInAdmin    = pathname.startsWith('/admin');
  const [settingsOpen, setSettingsOpen] = useState(isInSettings);
  const [adminOpen, setAdminOpen]       = useState(isInAdmin);

  return (
    <aside className="fixed top-0 left-0 h-screen w-64 bg-slate-900 text-white flex flex-col z-50">
      {/* Logo / Brand */}
      <div className="p-5 border-b border-slate-700 flex items-center gap-3">
        <div className="w-9 h-9 flex-shrink-0">
          <Image src="/logo.svg" alt="Sabtech Online" width={36} height={36} />
        </div>
        <div>
          <h1 className="text-sm font-bold text-white leading-tight">Sabtech Online</h1>
          <p className="text-xs text-slate-400">Invoicing System</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-3 space-y-0.5">
        {/* Main Nav */}
        {mainNav.map(({ label, href, icon: Icon }) => {
          const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-5 py-2.5 text-sm transition-colors ${
                isActive
                  ? 'bg-slate-800 text-white border-l-2 border-blue-500'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {label}
            </Link>
          );
        })}

        {/* Admin Section Divider */}
        <div className="pt-3 pb-1 px-5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Admin</p>
        </div>

        {/* Settings Accordion */}
        <button
          onClick={() => setSettingsOpen(o => !o)}
          className={`w-full flex items-center gap-3 px-5 py-2.5 text-sm transition-colors ${
            isInSettings
              ? 'bg-slate-800 text-white border-l-2 border-purple-500'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Settings className="h-4 w-4 flex-shrink-0" />
          <span className="flex-1 text-left">Settings</span>
          {settingsOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        </button>
        {settingsOpen && (
          <div className="ml-5 border-l border-slate-700 pl-3 space-y-0.5">
            {settingsNav.map(({ label, href, icon: Icon }) => {
              const isActive = pathname === href || pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-2.5 px-3 py-2 text-xs rounded-r transition-colors ${
                    isActive
                      ? 'bg-purple-900/50 text-purple-300'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                  {label}
                </Link>
              );
            })}
          </div>
        )}

        {/* Users */}
        {adminNav.map(({ label, href, icon: Icon }) => {
          const isActive = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-5 py-2.5 text-sm transition-colors ${
                isActive
                  ? 'bg-slate-800 text-white border-l-2 border-purple-500'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-700">
        <p className="text-xs text-slate-500 text-center">Sabtech Online &copy; 2026</p>
      </div>
    </aside>
  );
}
