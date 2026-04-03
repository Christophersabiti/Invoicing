'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Client, Project, Invoice, Payment } from '@/types';
import { formatCurrency, formatDate, BILLING_TYPE_LABELS } from '@/lib/utils';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ArrowLeft, Mail, Phone, MapPin } from 'lucide-react';

type Tab = 'overview' | 'projects' | 'invoices' | 'payments';

export default function ClientProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();
  const [client, setClient] = useState<Client | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [tab, setTab] = useState<Tab>('overview');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [{ data: c }, { data: p }, { data: inv }] = await Promise.all([
        supabase.from('clients').select('*').eq('id', id).single(),
        supabase.from('projects').select('*').eq('client_id', id).order('created_at', { ascending: false }),
        supabase.from('invoices').select('*').eq('client_id', id).order('issue_date', { ascending: false }),
      ]);
      setClient(c);
      setProjects(p || []);
      setInvoices(inv || []);

      // Fetch payments for this client's invoices
      const { data: allPay } = await supabase
        .from('payments')
        .select('*, invoice:invoices(invoice_number, client_id)')
        .order('payment_date', { ascending: false });
      setPayments(
        (allPay || []).filter(
          (pay: Payment & { invoice: { client_id: string } }) => pay.invoice?.client_id === id
        )
      );
      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) return <div className="p-12 text-center text-slate-400">Loading...</div>;
  if (!client) return <div className="p-12 text-center text-red-500">Client not found</div>;

  const totalBilled = invoices.reduce((s, i) => s + (i.total_amount || 0), 0);
  const totalPaid = invoices.reduce((s, i) => s + (i.total_paid || 0), 0);
  const totalOutstanding = invoices.reduce((s, i) => s + (i.balance_due || 0), 0);

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'projects', label: `Projects (${projects.length})` },
    { id: 'invoices', label: `Invoices (${invoices.length})` },
    { id: 'payments', label: `Payments (${payments.length})` },
  ];

  return (
    <div>
      <div className="mb-6">
        <button onClick={() => router.back()} className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-4">
          <ArrowLeft className="h-4 w-4" /> Back to Clients
        </button>
        <PageHeader
          title={client.name}
          subtitle={client.company_name || client.client_code}
          action={
            <Link
              href={`/invoices/new?client=${client.id}`}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg"
            >
              + New Invoice
            </Link>
          }
        />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total Billed', value: formatCurrency(totalBilled, client.currency), color: 'bg-blue-50 border-blue-200 text-blue-800' },
          { label: 'Total Paid', value: formatCurrency(totalPaid, client.currency), color: 'bg-green-50 border-green-200 text-green-800' },
          { label: 'Outstanding', value: formatCurrency(totalOutstanding, client.currency), color: 'bg-amber-50 border-amber-200 text-amber-800' },
        ].map(({ label, value, color }) => (
          <div key={label} className={`rounded-xl border px-5 py-4 ${color}`}>
            <p className="text-xs font-medium opacity-70">{label}</p>
            <p className="text-xl font-bold mt-1">{value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 mb-6">
        <nav className="flex gap-6">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                tab === t.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {tab === 'overview' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 grid grid-cols-2 gap-6">
          {[
            { label: 'Client Code', value: client.client_code, icon: null },
            { label: 'Contact Person', value: client.contact_person, icon: null },
            { label: 'Email', value: client.email, icon: <Mail className="h-4 w-4 text-slate-400" /> },
            { label: 'Phone', value: client.phone, icon: <Phone className="h-4 w-4 text-slate-400" /> },
            { label: 'Address', value: client.address, icon: <MapPin className="h-4 w-4 text-slate-400" /> },
            { label: 'TIN Number', value: client.tin_number, icon: null },
            { label: 'Currency', value: client.currency, icon: null },
            { label: 'Notes', value: client.notes, icon: null },
          ].map(({ label, value, icon }) => (
            <div key={label}>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">{label}</p>
              <p className="mt-1 text-sm text-slate-800 flex items-center gap-2">
                {icon}{value || '—'}
              </p>
            </div>
          ))}
        </div>
      )}

      {tab === 'projects' && (
        <div className="space-y-3">
          {projects.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-400">No projects yet</div>
          ) : projects.map(p => (
            <Link key={p.id} href={`/projects/${p.id}`} className="block bg-white border border-slate-200 rounded-xl p-4 hover:border-blue-300 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-900">{p.project_name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{p.project_code} · {BILLING_TYPE_LABELS[p.billing_type]}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                  p.status === 'active' ? 'bg-green-100 text-green-700' :
                  p.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                  'bg-slate-100 text-slate-600'
                }`}>{p.status}</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {tab === 'invoices' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['Invoice #', 'Date', 'Due', 'Total', 'Paid', 'Balance', 'Status', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoices.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-400">No invoices yet</td></tr>
              ) : invoices.map(inv => (
                <tr key={inv.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs">{inv.invoice_number}</td>
                  <td className="px-4 py-3 text-slate-600">{formatDate(inv.issue_date)}</td>
                  <td className="px-4 py-3 text-slate-600">{formatDate(inv.due_date)}</td>
                  <td className="px-4 py-3 font-medium">{formatCurrency(inv.total_amount, inv.currency)}</td>
                  <td className="px-4 py-3 text-green-700">{formatCurrency(inv.total_paid, inv.currency)}</td>
                  <td className="px-4 py-3 text-amber-700 font-medium">{formatCurrency(inv.balance_due, inv.currency)}</td>
                  <td className="px-4 py-3"><StatusBadge status={inv.status} /></td>
                  <td className="px-4 py-3">
                    <Link href={`/invoices/${inv.id}`} className="text-blue-600 hover:text-blue-800 text-xs">View →</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'payments' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['Payment #', 'Date', 'Invoice', 'Amount', 'Method', 'Reference'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payments.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400">No payments yet</td></tr>
              ) : payments.map((pay: Payment) => (
                <tr key={pay.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs">{pay.payment_number}</td>
                  <td className="px-4 py-3 text-slate-600">{formatDate(pay.payment_date)}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">
                    {(pay.invoice as Invoice & { invoice_number: string })?.invoice_number}
                  </td>
                  <td className="px-4 py-3 font-medium text-green-700">{formatCurrency(pay.amount_paid)}</td>
                  <td className="px-4 py-3 text-slate-600 capitalize">{pay.payment_method.replace('_', ' ')}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{pay.reference_number || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
