'use client';
import { UserCog, Clock } from 'lucide-react';

export default function UsersPage() {
  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">User Management</h1>
        <p className="text-sm text-slate-500 mt-1">Manage team access, roles, and permissions.</p>
      </div>
      <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-16 text-center">
        <div className="w-16 h-16 bg-purple-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <UserCog className="h-8 w-8 text-purple-400" />
        </div>
        <h2 className="text-lg font-semibold text-slate-700 mb-2">Coming in Phase 2C</h2>
        <p className="text-slate-400 text-sm max-w-sm mx-auto leading-relaxed">
          User invitations, role assignment, permission management, Google &amp; Apple login are being built next.
        </p>
        <div className="mt-6 inline-flex items-center gap-2 text-xs text-purple-600 bg-purple-50 px-4 py-2 rounded-full border border-purple-200">
          <Clock className="h-3.5 w-3.5" /> Phase 2C — User Management &amp; Auth
        </div>
      </div>
    </div>
  );
}
