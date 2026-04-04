'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Client } from '@/types';
import { formatDate } from '@/lib/utils';
import { PageHeader } from '@/components/ui/PageHeader';
import { Plus, Search, X, Building2, Mail, Phone } from 'lucide-react';

function generateClientCode(name: string): string {
  const base = name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 4).padEnd(4, 'X');
  const num = Math.floor(100 + Math.random() * 900);
  return `CLT-${base}-${num}`;
}

export default function ClientsPage() {
  const supabase = createClient();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '', company_name: '', contact_person: '', email: '',
    phone: '', address: '', tin_number: '', currency: 'UGX', notes: '',
  });

  const fetchClients = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('clients').select('*').order('created_at', { ascending: false });
    if (!showArchived) query = query.eq('is_archived', false);
    const { data } = await query;
    setClients(data || []);
    setLoading(false);
  }, [showArchived]);

  useEffect(() => { fetchClients(); }, [fetchClients]);

  const filtered = clients.filter(c =>
    [c.name, c.client_code, c.email, c.phone, c.company_name]
      .some(v => v?.toLowerCase().includes(search.toLowerCase()))
  );

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    const client_code = generateClientCode(form.name);
    const { error } = await supabase.from('clients').insert({ ...form, client_code });
    if (!error) {
      setShowModal(false);
      setForm({ name: '', company_name: '', contact_person: '', email: '', phone: '', address: '', tin_number: '', currency: 'UGX', notes: '' });
      fetchClients();
    } else {
      alert('Error: ' + error.message);
    }
    setSaving(false);
  }

  return (
    <div>
      <PageHeader
        title="Clients"
        subtitle={`${clients.length} client${clients.length !== 1 ? 's' : ''} registered`}
        action={
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="h-4 w-4" /> New Client
          </button>
        }
      />

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search clients..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer whitespace-nowrap">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={e => setShowArchived(e.target.checked)}
            className="rounded"
          />
          Show archived
        </label>
      </div>

      {/* Table / Cards */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-slate-400">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Building2 className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No clients found</p>
            <p className="text-sm text-slate-400 mt-1">Add your first client to get started</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    {['Code', 'Name', 'Company', 'Email', 'Phone', 'Added', ''].map(h => (
                      <th key={h} className="text-left px-4 py-3 font-medium text-slate-600 text-xs uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map(client => (
                    <tr key={client.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">{client.client_code}</td>
                      <td className="px-4 py-3 font-medium text-slate-900">{client.name}</td>
                      <td className="px-4 py-3 text-slate-600">{client.company_name || '—'}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {client.email ? (
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />{client.email}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{client.phone || '—'}</td>
                      <td className="px-4 py-3 text-slate-400">{formatDate(client.created_at)}</td>
                      <td className="px-4 py-3">
                        <Link href={`/clients/${client.id}`} className="text-blue-600 hover:text-blue-800 font-medium text-xs">
                          View →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="sm:hidden divide-y divide-slate-100">
              {filtered.map(client => (
                <div key={client.id} className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 truncate">{client.name}</p>
                      {client.company_name && (
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                          <Building2 className="h-3 w-3 flex-shrink-0" />{client.company_name}
                        </p>
                      )}
                    </div>
                    <Link
                      href={`/clients/${client.id}`}
                      className="flex-shrink-0 text-blue-600 text-xs font-medium bg-blue-50 px-2.5 py-1 rounded-lg"
                    >
                      View
                    </Link>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                    {client.email && (
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Mail className="h-3 w-3" />{client.email}
                      </span>
                    )}
                    {client.phone && (
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Phone className="h-3 w-3" />{client.phone}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-1.5 font-mono">{client.client_code} · Added {formatDate(client.created_at)}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* New Client Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white w-full sm:rounded-2xl sm:max-w-lg max-h-[95vh] sm:max-h-[90vh] overflow-y-auto rounded-t-2xl">
            <div className="flex items-center justify-between p-5 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">New Client</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-5 space-y-4">
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
                      value={(form as Record<string, string>)[key]}
                      onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                ))}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Billing Address</label>
                <textarea
                  value={form.address}
                  onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                  rows={2}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Currency</label>
                <select
                  value={form.currency}
                  onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {['UGX', 'USD', 'EUR', 'GBP', 'KES'].map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-3 pt-2 sticky bottom-0 bg-white pb-1">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 border border-slate-200 text-slate-700 py-2.5 rounded-lg text-sm hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg text-sm font-medium disabled:opacity-50"
                >
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
