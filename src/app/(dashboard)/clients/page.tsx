'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Client, ClientWithStats } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { PageHeader } from '@/components/ui/PageHeader';
import { EditClientPanel } from '@/components/clients/EditClientPanel';
import { useClientFilters } from '@/hooks/useClientFilters';
import {
  Plus, Search, X, Building2, Mail, Phone,
  AlertCircle, FolderOpen, Edit2, Filter,
} from 'lucide-react';

function generateClientCode(name: string): string {
  const base = name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 4).padEnd(4, 'X');
  const num = Math.floor(100 + Math.random() * 900);
  return `CLT-${base}-${num}`;
}

const CURRENCIES = ['UGX', 'USD', 'EUR', 'GBP', 'KES'];

const emptyNewForm = {
  name: '', company_name: '', contact_person: '', email: '',
  phone: '', address: '', tin_number: '', currency: 'UGX', notes: '',
};

export default function ClientsPage() {
  const supabase = createClient();
  const { filters, patch, clear, hasActive } = useClientFilters();

  const [clients, setClients]         = useState<ClientWithStats[]>([]);
  const [loading, setLoading]         = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [editClient, setEditClient]   = useState<Client | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [saving, setSaving]           = useState(false);
  const [newForm, setNewForm]         = useState(emptyNewForm);

  const fetchClients = useCallback(async () => {
    setLoading(true);

    if (showArchived) {
      // Archived view — plain query, no stats
      const { data } = await supabase
        .from('clients')
        .select('*')
        .eq('is_archived', true)
        .order('name');
      setClients(
        (data || []).map(c => ({ ...c, active_projects: 0, total_outstanding: 0, has_overdue: false })) as ClientWithStats[],
      );
    } else {
      // Live view — use RPC for aggregated stats
      const params: Record<string, unknown> = {};
      if (filters.search)              params.p_search   = filters.search;
      if (filters.status)              params.p_status   = [filters.status];
      if (filters.hasOverdue !== null)         params.p_has_overdue          = filters.hasOverdue;
      if (filters.hasActiveProjects !== null)  params.p_has_active_projects  = filters.hasActiveProjects;
      if (filters.currency)            params.p_currency = filters.currency;

      const { data } = await supabase.rpc('get_clients_filtered', params);
      setClients(
        (data || []).map((c: ClientWithStats) => ({ ...c, updated_by: null })) as ClientWithStats[],
      );
    }
    setLoading(false);
  }, [showArchived, filters.search, filters.status, filters.hasOverdue, filters.hasActiveProjects, filters.currency]);

  useEffect(() => { fetchClients(); }, [fetchClients]);

  // Summary stats from loaded data
  const totalClients  = clients.length;
  const activeCount   = clients.filter(c => c.status === 'active').length;
  const overdueCount  = clients.filter(c => c.has_overdue).length;

  async function handleNewSave(e: React.FormEvent) {
    e.preventDefault();
    if (!newForm.name.trim()) return;
    setSaving(true);
    const client_code = generateClientCode(newForm.name);
    const { error } = await supabase.from('clients').insert({ ...newForm, client_code });
    if (!error) {
      setShowNewModal(false);
      setNewForm(emptyNewForm);
      fetchClients();
    } else {
      alert('Error: ' + error.message);
    }
    setSaving(false);
  }

  async function handleArchiveToggle(client: Client) {
    await supabase.from('clients').update({ is_archived: !client.is_archived }).eq('id', client.id);
    fetchClients();
  }

  return (
    <div>
      <PageHeader
        title="Clients"
        subtitle={`${totalClients} client${totalClients !== 1 ? 's' : ''}${showArchived ? ' (archived)' : ''}`}
        action={
          <button
            onClick={() => setShowNewModal(true)}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="h-4 w-4" /> New Client
          </button>
        }
      />

      {/* Stats bar */}
      {!showArchived && (
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: 'Total', value: totalClients, color: 'text-slate-700' },
            { label: 'Active',  value: activeCount,  color: 'text-green-700' },
            { label: 'Overdue', value: overdueCount,  color: overdueCount > 0 ? 'text-red-600' : 'text-slate-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white border border-slate-200 rounded-xl p-3 text-center shadow-sm">
              <p className={`text-xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Search & Filter bar */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search clients..."
            value={filters.search}
            onChange={e => patch('search', e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowFilters(v => !v)}
            className={`inline-flex items-center gap-2 px-3 py-2 border rounded-lg text-sm transition-colors ${
              showFilters || hasActive
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-slate-200 text-slate-600 hover:border-slate-300'
            }`}
          >
            <Filter className="h-4 w-4" />
            Filters
            {hasActive && (
              <span className="w-4 h-4 bg-blue-600 text-white rounded-full text-[10px] flex items-center justify-center font-bold">
                {[filters.status, filters.hasOverdue, filters.hasActiveProjects, filters.currency].filter(Boolean).length}
              </span>
            )}
          </button>
          <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer whitespace-nowrap px-3 py-2 border border-slate-200 rounded-lg hover:border-slate-300">
            <input type="checkbox" checked={showArchived} onChange={e => setShowArchived(e.target.checked)} className="rounded" />
            Archived
          </label>
        </div>
      </div>

      {/* Filter panel */}
      {showFilters && !showArchived && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 mb-4 shadow-sm">
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
              <select
                value={filters.status}
                onChange={e => patch('status', e.target.value)}
                className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Overdue</label>
              <select
                value={filters.hasOverdue === null ? '' : String(filters.hasOverdue)}
                onChange={e => patch('hasOverdue', e.target.value === '' ? null : e.target.value === 'true')}
                className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Any</option>
                <option value="true">Has overdue</option>
                <option value="false">No overdue</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Active Projects</label>
              <select
                value={filters.hasActiveProjects === null ? '' : String(filters.hasActiveProjects)}
                onChange={e => patch('hasActiveProjects', e.target.value === '' ? null : e.target.value === 'true')}
                className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Any</option>
                <option value="true">Has active</option>
                <option value="false">None</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Currency</label>
              <select
                value={filters.currency}
                onChange={e => patch('currency', e.target.value)}
                className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All</option>
                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            {hasActive && (
              <button onClick={clear}
                className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50">
                <X className="h-3.5 w-3.5" /> Clear
              </button>
            )}
          </div>
        </div>
      )}

      {/* Table / Cards */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-slate-400">Loading...</div>
        ) : clients.length === 0 ? (
          <div className="p-12 text-center">
            <Building2 className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No clients found</p>
            {hasActive && (
              <button onClick={clear} className="mt-2 text-sm text-blue-600 hover:underline">Clear filters</button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    {['Code', 'Name / Company', 'Email', 'Phone', 'Projects', 'Outstanding', 'Status', ''].map(h => (
                      <th key={h} className="text-left px-4 py-3 font-medium text-slate-600 text-xs uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {clients.map(c => (
                    <tr key={c.id} className={`hover:bg-slate-50 transition-colors ${c.is_archived ? 'opacity-50' : ''}`}>
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">{c.client_code}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">{c.name}</p>
                        {c.company_name && <p className="text-xs text-slate-400 mt-0.5">{c.company_name}</p>}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {c.email
                          ? <span className="flex items-center gap-1"><Mail className="h-3 w-3 text-slate-400" />{c.email}</span>
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{c.phone || '—'}</td>
                      <td className="px-4 py-3 text-center">
                        {c.active_projects > 0
                          ? <span className="inline-flex items-center gap-1 text-blue-600"><FolderOpen className="h-3.5 w-3.5" />{c.active_projects}</span>
                          : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {c.total_outstanding > 0 ? (
                          <span className={`font-medium ${c.has_overdue ? 'text-red-600' : 'text-amber-700'}`}>
                            {formatCurrency(c.total_outstanding, c.currency)}
                            {c.has_overdue && <AlertCircle className="inline h-3.5 w-3.5 ml-1 text-red-500" />}
                          </span>
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          c.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {c.status ?? 'active'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => setEditClient(c)}
                            className="text-slate-400 hover:text-blue-600 transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <Link href={`/clients/${c.id}`} className="text-blue-600 hover:text-blue-800 font-medium text-xs whitespace-nowrap">
                            View →
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-slate-100">
              {clients.map(c => (
                <div key={c.id} className={`p-4 ${c.is_archived ? 'opacity-50' : ''}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-slate-900 truncate">{c.name}</p>
                        {c.has_overdue && <AlertCircle className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />}
                      </div>
                      {c.company_name && (
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                          <Building2 className="h-3 w-3 flex-shrink-0" />{c.company_name}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button onClick={() => setEditClient(c)} className="text-slate-400 hover:text-blue-600 p-1">
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <Link href={`/clients/${c.id}`} className="text-blue-600 text-xs font-medium bg-blue-50 px-2.5 py-1 rounded-lg">
                        View
                      </Link>
                    </div>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                    {c.email && (
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Mail className="h-3 w-3" />{c.email}
                      </span>
                    )}
                    {c.phone && (
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Phone className="h-3 w-3" />{c.phone}
                      </span>
                    )}
                  </div>

                  <div className="mt-2 flex items-center justify-between">
                    <p className="text-xs text-slate-400 font-mono">{c.client_code}</p>
                    <div className="flex items-center gap-3">
                      {c.active_projects > 0 && (
                        <span className="text-xs text-blue-600 flex items-center gap-1">
                          <FolderOpen className="h-3 w-3" />{c.active_projects}
                        </span>
                      )}
                      {c.total_outstanding > 0 && (
                        <span className={`text-xs font-medium ${c.has_overdue ? 'text-red-600' : 'text-amber-700'}`}>
                          {formatCurrency(c.total_outstanding, c.currency)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Edit slide-over */}
      <EditClientPanel
        client={editClient}
        onClose={() => setEditClient(null)}
        onSaved={updated => {
          setClients(cs => cs.map(c => c.id === updated.id ? { ...c, ...updated } : c));
          setEditClient(null);
        }}
      />

      {/* New Client Modal */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white w-full sm:rounded-2xl sm:max-w-lg max-h-[95vh] sm:max-h-[90vh] overflow-y-auto rounded-t-2xl">
            <div className="flex items-center justify-between p-5 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">New Client</h2>
              <button onClick={() => setShowNewModal(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleNewSave} className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { label: 'Client Name *', key: 'name', required: true, colSpan: true },
                  { label: 'Company Name', key: 'company_name' },
                  { label: 'Contact Person', key: 'contact_person' },
                  { label: 'Email', key: 'email', type: 'email' },
                  { label: 'Phone', key: 'phone' },
                  { label: 'TIN Number', key: 'tin_number' },
                ].map(({ label, key, required, type, colSpan }) => (
                  <div key={key} className={colSpan ? 'sm:col-span-2' : ''}>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
                    <input
                      type={type || 'text'}
                      required={required}
                      value={(newForm as Record<string, string>)[key]}
                      onChange={e => setNewForm(f => ({ ...f, [key]: e.target.value }))}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                ))}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Billing Address</label>
                <textarea value={newForm.address}
                  onChange={e => setNewForm(f => ({ ...f, address: e.target.value }))}
                  rows={2}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Currency</label>
                <select value={newForm.currency}
                  onChange={e => setNewForm(f => ({ ...f, currency: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                <textarea value={newForm.notes}
                  onChange={e => setNewForm(f => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-3 pt-2 sticky bottom-0 bg-white pb-1">
                <button type="button" onClick={() => setShowNewModal(false)}
                  className="flex-1 border border-slate-200 text-slate-700 py-2.5 rounded-lg text-sm hover:bg-slate-50">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg text-sm font-medium disabled:opacity-50">
                  {saving ? 'Saving...' : 'Save Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
