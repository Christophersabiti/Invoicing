'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Users, FolderOpen, Tag, FileText,
  CreditCard, BarChart2, Settings, UserCog, Building2,
  Wallet, Receipt, Palette, ChevronLeft, ChevronRight,
  ChevronDown, LogOut,
} from 'lucide-react';
import { useState, useEffect, ElementType } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useSidebar } from './SidebarContext';
import { NavItem } from './NavItem';

// ─── Nav definitions ─────────────────────────────────────────────────────────

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
  { label: 'Users', href: '/admin/users', icon: UserCog },
];

// ─── User info ───────────────────────────────────────────────────────────────

type UserInfo = { name: string | null; email: string; role: string };

function useCurrentUserInfo() {
  const supabase = createClient();
  const [info, setInfo] = useState<UserInfo | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !active) return;
      const { data } = await supabase
        .from('app_users')
        .select('full_name, email, role')
        .eq('auth_user_id', session.user.id)
        .single();
      if (!active) return;
      if (data) {
        setInfo({ name: data.full_name, email: data.email, role: data.role });
      } else {
        setInfo({
          name:  session.user.user_metadata?.full_name ?? null,
          email: session.user.email ?? '',
          role:  'staff',
        });
      }
    }
    load();
    return () => { active = false; };
  }, []);

  return info;
}

// ─── Settings sub-nav (collapsed: icon-only tooltip group) ───────────────────

function SettingsSection({
  collapsed, pathname,
}: { collapsed: boolean; pathname: string }) {
  const isInSettings = pathname.startsWith('/admin/settings');
  const [open, setOpen] = useState(isInSettings);

  // In collapsed mode: just show the Settings icon as a link to the first page
  if (collapsed) {
    return (
      <div className="relative group/navitem">
        <Link
          href="/admin/settings/company"
          className={`flex justify-center py-2.5 text-sm transition-colors
            ${isInSettings
              ? 'bg-slate-800 text-white border-l-2 border-purple-500'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
        >
          <Settings className="h-4 w-4 flex-shrink-0" />
        </Link>
        <div className="pointer-events-none absolute left-full top-1/2 z-50 ml-2
                       -translate-y-1/2 whitespace-nowrap rounded-md bg-slate-700
                       px-2.5 py-1.5 text-xs font-medium text-white shadow-lg
                       opacity-0 group-hover/navitem:opacity-100 transition-opacity duration-150">
          Settings
          <span className="absolute right-full top-1/2 -translate-y-1/2
                           border-4 border-transparent border-r-slate-700" />
        </div>
      </div>
    );
  }

  // Expanded mode: accordion
  return (
    <>
      <button
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center gap-3 px-5 py-2.5 text-sm transition-colors
          ${isInSettings
            ? 'bg-slate-800 text-white border-l-2 border-purple-500'
            : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
      >
        <Settings className="h-4 w-4 flex-shrink-0" />
        <span className="flex-1 text-left">Settings</span>
        {open
          ? <ChevronDown className="h-3 w-3 flex-shrink-0" />
          : <ChevronRight className="h-3 w-3 flex-shrink-0" />
        }
      </button>
      {open && (
        <div className="ml-5 border-l border-slate-700 pl-3 space-y-0.5">
          {settingsNav.map(({ label, href, icon: Icon }) => {
            const isActive = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2.5 px-3 py-2 text-xs rounded-r transition-colors
                  ${isActive
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
    </>
  );
}

// ─── User footer ─────────────────────────────────────────────────────────────

function UserFooter({ collapsed, user, onLogout }: {
  collapsed: boolean;
  user:      UserInfo | null;
  onLogout:  () => void;
}) {
  if (!user) return (
    <div className="p-4 border-t border-slate-700">
      <div className="h-8 rounded bg-slate-800 animate-pulse" />
    </div>
  );

  const initial = (user.name ?? user.email).charAt(0).toUpperCase();

  if (collapsed) {
    return (
      <div className="p-2 border-t border-slate-700 flex flex-col items-center gap-2">
        <div className="relative group/navitem">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-600
                         flex items-center justify-center text-white text-xs font-bold cursor-default">
            {initial}
          </div>
          <div className="pointer-events-none absolute left-full bottom-0 z-50 ml-2
                         whitespace-nowrap rounded-md bg-slate-700 px-2.5 py-1.5
                         text-xs font-medium text-white shadow-lg
                         opacity-0 group-hover/navitem:opacity-100 transition-opacity duration-150">
            {user.name ?? user.email}
            <span className="block text-slate-400 capitalize">{user.role.replace('_', ' ')}</span>
            <span className="absolute right-full top-1/2 -translate-y-1/2
                             border-4 border-transparent border-r-slate-700" />
          </div>
        </div>
        <button
          onClick={onLogout}
          title="Sign out"
          className="text-slate-400 hover:text-white transition-colors"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 border-t border-slate-700 flex items-center gap-3">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-600
                     flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
        {initial}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-white truncate">{user.name ?? user.email}</p>
        <p className="text-xs text-slate-400 truncate capitalize">{user.role.replace('_', ' ')}</p>
      </div>
      <button
        onClick={onLogout}
        title="Sign out"
        className="text-slate-400 hover:text-white transition-colors flex-shrink-0"
      >
        <LogOut className="h-4 w-4" />
      </button>
    </div>
  );
}

// ─── Sidebar nav content (reusable in both desktop + mobile drawer) ───────────

export function SidebarNavContent({
  collapsed = false,
  onNavClick,
}: {
  collapsed?: boolean;
  onNavClick?: () => void;
}) {
  const pathname = usePathname();
  const router   = useRouter();
  const user     = useCurrentUserInfo();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  }

  return (
    <div className="flex flex-col h-full bg-slate-900 text-white">
      {/* Logo */}
      <div className={`border-b border-slate-700 flex items-center
        ${collapsed ? 'p-3 justify-center' : 'p-5 gap-3'}`}>
        <div className="w-9 h-9 flex-shrink-0">
          <Image src="/logo.svg" alt="SAB" width={36} height={36} />
        </div>
        {!collapsed && (
          <div>
            <h1 className="text-sm font-bold text-white leading-tight">Sabtech Online</h1>
            <p className="text-xs text-slate-400">Invoicing System</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 space-y-0.5" aria-label="Main navigation">
        {/* Main items */}
        {mainNav.map(({ label, href, icon }) => {
          const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href);
          return (
            <NavItem
              key={href}
              href={href}
              label={label}
              icon={icon as ElementType}
              isActive={isActive}
              collapsed={collapsed}
              accent="blue"
              onClick={onNavClick}
            />
          );
        })}

        {/* Admin divider */}
        {!collapsed && (
          <div className="pt-3 pb-1 px-5">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Admin</p>
          </div>
        )}
        {collapsed && <div className="my-2 mx-3 border-t border-slate-700/60" />}

        {/* Settings */}
        <SettingsSection collapsed={collapsed} pathname={pathname} />

        {/* Users */}
        {adminNav.map(({ label, href, icon }) => {
          const isActive = pathname.startsWith(href);
          return (
            <NavItem
              key={href}
              href={href}
              label={label}
              icon={icon as ElementType}
              isActive={isActive}
              collapsed={collapsed}
              accent="purple"
              onClick={onNavClick}
            />
          );
        })}
      </nav>

      {/* User footer */}
      <UserFooter collapsed={collapsed} user={user} onLogout={handleLogout} />
    </div>
  );
}

// ─── Desktop Sidebar ──────────────────────────────────────────────────────────

export function Sidebar() {
  const { collapsed, toggle } = useSidebar();

  return (
    <aside
      className={`hidden lg:flex flex-col fixed top-0 left-0 h-screen z-40
                  bg-slate-900 border-r border-slate-700/50
                  transition-all duration-200 ease-in-out
                  ${collapsed ? 'w-16' : 'w-64'}`}
      aria-label="Sidebar"
    >
      {/* Collapse toggle button */}
      <button
        onClick={toggle}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        aria-expanded={!collapsed}
        className="absolute -right-3 top-[72px] z-50 w-6 h-6 rounded-full
                   bg-slate-700 border border-slate-600 text-slate-300
                   hover:bg-slate-600 hover:text-white transition-colors
                   flex items-center justify-center shadow-md"
      >
        {collapsed
          ? <ChevronRight className="h-3 w-3" />
          : <ChevronLeft  className="h-3 w-3" />
        }
      </button>

      <SidebarNavContent collapsed={collapsed} />
    </aside>
  );
}
