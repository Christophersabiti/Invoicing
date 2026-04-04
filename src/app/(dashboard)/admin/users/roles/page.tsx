'use client';

import { useEffect, useState, Fragment } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Role, Permission } from '@/types';
import { Shield, Loader2, CheckCircle, XCircle } from 'lucide-react';

const ROLE_COLORS: Record<string, string> = {
  super_admin:     'bg-red-600',
  admin:           'bg-orange-500',
  finance:         'bg-blue-600',
  project_manager: 'bg-purple-600',
  staff:           'bg-slate-500',
  client:          'bg-green-600',
};

export default function RolesPage() {
  const supabase = createClient();
  const [roles, setRoles]               = useState<Role[]>([]);
  const [permissions, setPermissions]   = useState<Permission[]>([]);
  const [rolePerms, setRolePerms]       = useState<Record<string, Set<string>>>({});
  const [loading, setLoading]           = useState(true);

  useEffect(() => {
    async function load() {
      const [{ data: rolesData }, { data: permsData }, { data: rpData }] = await Promise.all([
        supabase.from('roles').select('*').order('created_at'),
        supabase.from('permissions').select('*').order('module').order('action'),
        supabase.from('role_permissions').select('role_id, permission_id'),
      ]);
      setRoles((rolesData || []) as Role[]);
      setPermissions((permsData || []) as Permission[]);
      const map: Record<string, Set<string>> = {};
      (rpData || []).forEach((rp: { role_id: string; permission_id: string }) => {
        if (!map[rp.role_id]) map[rp.role_id] = new Set();
        map[rp.role_id].add(rp.permission_id);
      });
      setRolePerms(map);
      setLoading(false);
    }
    load();
  }, []);

  // Group permissions by module
  const modules = [...new Set(permissions.map(p => p.module))];

  if (loading) return (
    <div className="py-16 text-center text-slate-400 flex items-center justify-center gap-2">
      <Loader2 className="h-5 w-5 animate-spin" /> Loading roles…
    </div>
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Roles & Permissions</h1>
        <p className="text-sm text-slate-500 mt-1">
          Read-only permission matrix showing what each role can do.
          Per-user overrides are managed on the User Detail page.
        </p>
      </div>

      {/* Role Cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {roles.map(role => (
          <div key={role.id} className="bg-white border border-slate-200 rounded-xl p-4 flex items-start gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${ROLE_COLORS[role.id] ?? 'bg-slate-500'}`}>
              <Shield className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="font-semibold text-slate-900 text-sm">{role.label}</p>
              <p className="text-xs text-slate-400 mt-0.5">{role.description}</p>
              <p className="text-xs text-purple-600 mt-1 font-medium">
                {rolePerms[role.id]?.size ?? 0} permissions
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Permission Matrix */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 font-semibold text-slate-600 w-48">Permission</th>
                {roles.map(r => (
                  <th key={r.id} className="px-3 py-3 text-center font-semibold text-slate-600 min-w-[90px]">
                    <div className="flex flex-col items-center gap-1">
                      <div className={`w-6 h-6 rounded ${ROLE_COLORS[r.id] ?? 'bg-slate-500'} flex items-center justify-center`}>
                        <Shield className="h-3 w-3 text-white" />
                      </div>
                      <span className="leading-tight">{r.label}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {modules.map(module => (
                <Fragment key={module}>
                  {/* Module header row */}
                  <tr className="bg-slate-50/50">
                    <td colSpan={roles.length + 1} className="px-4 py-2">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{module}</span>
                    </td>
                  </tr>
                  {permissions
                    .filter(p => p.module === module)
                    .map(perm => (
                      <tr key={perm.id} className="border-t border-slate-100 hover:bg-slate-50/50">
                        <td className="px-4 py-2.5 text-slate-700">
                          <span className="font-medium">{perm.label}</span>
                          <span className="text-slate-400 ml-1 font-mono">({perm.id})</span>
                        </td>
                        {roles.map(r => {
                          const has = rolePerms[r.id]?.has(perm.id);
                          return (
                            <td key={r.id} className="px-3 py-2.5 text-center">
                              {has
                                ? <CheckCircle className="h-4 w-4 text-green-500 mx-auto" />
                                : <XCircle className="h-4 w-4 text-slate-200 mx-auto" />
                              }
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  }
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
