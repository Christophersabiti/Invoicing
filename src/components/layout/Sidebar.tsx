'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  LayoutDashboard, Users, FolderOpen, Tag, FileText,
  CreditCard, BarChart2, Settings, UserCog, Building2,
  Wallet, Receipt, Palette, ChevronDown, ChevronRight, LogOut,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

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

type UserInfo = { name: string | null; email: string; role: string };

export function Sidebar() {
  const pathname = usePathname();
  const router   = useRouter();
  const supabase = createClient();
  const isInSettings = pathname.startsWith('/admin/settings');
  const [settingsOpen, setSettingsOpen] = useState(isInSettings);
  const [currentUser, setCurrentUser]   = useState<UserInfo | null>(null);

  useEffect(() => {
    async function fetchUser() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: appUser } = await supabase
        .from('app_users')
        .select('full_name, email, role')
        .eq('auth_user_id', session.user.id)
        .single();
      if (appUser) {
        setCurrentUser({ name: appUser.full_name, email: appUser.email, role: appUser.role });
      } else {
        setCurrentUser({ name: session.user.user_metadata?.full_name ?? null, email: session.user.email ?? '', role: 'staff' });
      }
    }
    fetchUser();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
  }

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

      {/* User + Logout */}
      <div className="p-4 border-t border-slate-700">
        {currentUser ? (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {(currentUser.name ?? currentUser.email).charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">{currentUser.name ?? currentUser.email}</p>
              <p className="text-xs text-slate-400 truncate capitalize">{currentUser.role.replace('_', ' ')}</p>
            </div>
            <button
              onClick={handleLogout}
              title="Sign out"
              className="text-slate-400 hover:text-white transition-colors flex-shrink-0"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <p className="text-xs text-slate-500 text-center">Sabtech Online &copy; 2026</p>
        )}
      </div>
    </aside>
  );
}
