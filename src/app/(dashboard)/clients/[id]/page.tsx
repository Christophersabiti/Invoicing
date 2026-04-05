'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Client, Invoice, Payment, ProjectWithTotals } from '@/types';
import {
  formatCurrency, formatDate, BILLING_TYPE_LABELS,
  PAYMENT_METHOD_LABELS, STATUS_LABELS,
} from '@/lib/utils';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EditClientPanel } from '@/components/clients/EditClientPanel';
import {
  ArrowLeft, Mail, Phone, MapPin, Building2, Edit2,
  Archive, ArchiveRestore, Plus, FileText, CreditCard,
  FolderOpen, AlertCircle, FileDown,
} from 'lucide-react';

type Tab = 'overview' | 'details' | 'projects' | 'invoices' | 'payments' | 'statement';

const TAB_LIST: { id: Tab; label: string }[] = [
  { id: 'overview',  label: 'Overview'  },
  { id: 'details',   label: 'Details'   },
  { id: 'projects',  label: 'Projects'  },
  { id: 'invoices',  label: 'Invoices'  },
  { id: 'payments',  label: 'Payments'  },
  { id: 'statement', label: 'Statement' },
];

const statusColor: Record<string, string> = {
  active:    'bg-green-100 text-green-700',
  on_hold:   'bg-amber-100 text-amber-700',
  completed: 'bg-blue-100 text-blue-700',
  cancelled: 'bg-slate-100 text-slate-500',
};

const paymentStatusColor = (s: string) => {
  if (s === 'reversed') return 'bg-red-100 text-red-600';
  if (s === 'failed')   return 'bg-amber-100 text-amber-700';
  if (s === 'pending')  return 'bg-slate-100 text-slate-500';
  return 'bg-green-100 text-green-700';
};

export default function ClientProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();
  const supabase = createClient();

  const [client,   setClient]   = useState<Client | null>(null);
  const [projects, setProjects] = useState<ProjectWithTotals[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<(Payment & { invoice: { invoice_number: string } })[]>([]);
  const [tab,      setTab]      = useState<Tab>('overview');
  const [loading,  setLoading]  = useState(true);
  const [editing,  setEditing]  = useState(false);
  const [archiving, setArchiving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: c }, { data: proj }, { data: inv }] = await Promise.all([
      supabase.from('clients').select('*').eq('id', id).single(),
      supabase.from('project_totals').select('*').eq('client_id', id).order('created_at', { ascending: false }),
      supabase.from('invoices').select('*').eq('client_id', id).order('issue_date', { ascending: false }),
    ]);
    setClient(c);
    setProjects((proj || []) as ProjectWithTotals[]);
    setInvoices((inv || []) as Invoice[]);

    // Payments filtered to this client's invoices
    if (inv && inv.length > 0) {
      const invoiceIds = inv.map((i: Invoice) => i.id);
      const { data: pays } = await supabase
        .from('payments')
        .select('*, invoice:invoices(invoice_number)')
        .in('invoice_id', invoiceIds)
        .order('payment_date', { ascending: false });
      setPayments((pays || []) as (Payment & { invoice: { invoice_number: string } })[]);
    } else {
      setPayments([]);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="p-12 text-center text-slate-400">Loading...</div>;
  if (!client) return <div className="p-12 text-center text-red-500">Client not found</div>;

  // Financial totals — exclude void/cancelled
  const activeInvoices  = invoices.filter(i => i.status !== 'void' && i.status !== 'cancelled');
  const totalBilled     = activeInvoices.reduce((s, i) => s + i.total_amount, 0);
  const totalPaid       = activeInvoices.reduce((s, i) => s + i.total_paid, 0);
  const totalOutstanding = activeInvoices.reduce((s, i) => s + i.balance_due, 0);
  const confirmedPayments = payments.filter(p => p.status !== 'reversed');

  async function handleArchiveToggle() {
  if (!client) return;

  try {
    setArchiving(true);

    const nextArchivedState = !client.is_archived;

    const { error } = await supabase
      .from('clients')
      .update({ is_archived: nextArchivedState })
      .eq('id', client.id);

    if (error) {
      console.error('Failed to toggle archive status:', error);
      return;
    }

    setClient(current =>
      current ? { ...current, is_archived: nextArchivedState } : current
    );
  } catch (error) {
    console.error('Unexpected archive toggle error:', error);
  } finally {
    setArchiving(false);
  }
}

  const tabLabels: Record<Tab, string> = {
    overview:  'Overview',
    details:   'Details',
    projects:  `Projects (${projects.length})`,
    invoices:  `Invoices (${invoices.length})`,
    payments:  `Payments (${confirmedPayments.length})`,
    statement: 'Statement',
  };

  return (
    <div>
      {/* Back + Header */}
      <div className="mb-5">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-3"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Clients
        </button>
        <PageHeader
          title={client.name}
          subtitle={
            <span className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-sm">{client.client_code}</span>
              {client.company_name && <span className="text-slate-400">·</span>}
              {client.company_name && <span>{client.company_name}</span>}
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                client.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
              }`}>
                {client.status ?? 'active'}
              </span>
              {client.is_archived && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                  Archived
                </span>
              )}
            </span>
          }
          action={
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setEditing(true)}
                className="inline-flex items-center gap-2 border border-slate-200 text-slate-700 hover:bg-slate-50 text-sm font-medium px-3 py-2 rounded-lg transition-colors"
              >
                <Edit2 className="h-4 w-4" /> Edit
              </button>
              <button
                onClick={handleArchiveToggle}
                disabled={archiving}
                className="inline-flex items-center gap-2 border border-slate-200 text-slate-700 hover:bg-slate-50 text-sm font-medium px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
              >
                {client.is_archived
                  ? <><ArchiveRestore className="h-4 w-4" /> Restore</>
                  : <><Archive className="h-4 w-4" /> Archive</>}
              </button>
              <Link
                href={`/invoices/new?client=${client.id}`}
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                <Plus className="h-4 w-4" /> New Invoice
              </Link>
            </div>
          }
        />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        {[
          { label: 'Total Billed',  value: formatCurrency(totalBilled, client.currency),      color: 'bg-blue-50  border-blue-200  text-blue-800',  icon: FileText  },
          { label: 'Total Paid',    value: formatCurrency(totalPaid, client.currency),        color: 'bg-green-50 border-green-200 text-green-800', icon: CreditCard },
          { label: 'Outstanding',   value: formatCurrency(totalOutstanding, client.currency), color: 'bg-amber-50 border-amber-200 text-amber-800', icon: AlertCircle },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className={`rounded-xl border px-4 py-3 flex items-center gap-3 ${color}`}>
            <Icon className="h-5 w-5 opacity-60 flex-shrink-0" />
            <div>
              <p className="text-xs font-medium opacity-70">{label}</p>
              <p className="text-lg font-bold mt-0.5">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs — horizontally scrollable on mobile */}
      <div className="border-b border-slate-200 mb-5 overflow-x-auto pb-px">
        <nav className="flex gap-1 min-w-max">
          {TAB_LIST.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                tab === t.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {tabLabels[t.id]}
            </button>
          ))}
        </nav>
      </div>

      {/* ── OVERVIEW ─────────────────────────────────────────────── */}
      {tab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Quick info card */}
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">Contact Information</h3>
            <div className="space-y-3">
              {client.email && (
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-slate-400 flex-shrink-0" />
                  <a href={`mailto:${client.email}`} className="text-sm text-blue-600 hover:underline">{client.email}</a>
                </div>
              )}
              {client.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-slate-400 flex-shrink-0" />
                  <span className="text-sm text-slate-700">{client.phone}</span>
                </div>
              )}
              {client.alternate_phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-slate-300 flex-shrink-0" />
                  <span className="text-sm text-slate-500">{client.alternate_phone}</span>
                </div>
              )}
              {(client.city || client.country) && (
                <div className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-slate-400 flex-shrink-0" />
                  <span className="text-sm text-slate-700">
                    {[client.city, client.country].filter(Boolean).join(', ')}
                  </span>
                </div>
              )}
              {client.address && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-slate-300 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-slate-500 whitespace-pre-line">{client.address}</span>
                </div>
              )}
            </div>
          </div>

          {/* Business info card */}
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">Business Details</h3>
            <dl className="space-y-2.5">
              {[
                { label: 'Client Code',    value: client.client_code, mono: true },
                { label: 'Company',        value: client.company_name },
                { label: 'Contact Person', value: client.contact_person },
                { label: 'TIN Number',     value: client.tin_number, mono: true },
                { label: 'Currency',       value: client.currency },
                { label: 'Client Since',   value: formatDate(client.created_at) },
              ].map(({ label, value, mono }) => value ? (
                <div key={label} className="flex items-start justify-between gap-4">
                  <dt className="text-xs text-slate-400 font-medium uppercase tracking-wide flex-shrink-0">{label}</dt>
                  <dd className={`text-sm text-slate-800 text-right ${mono ? 'font-mono' : ''}`}>{value}</dd>
                </div>
              ) : null)}
            </dl>
          </div>

          {/* Recent activity */}
          {projects.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 md:col-span-2">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Active Projects</h3>
              <div className="space-y-2">
                {projects.filter(p => p.status === 'active').slice(0, 3).map(p => (
                  <Link key={p.id} href={`/projects/${p.id}`}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 border border-slate-100 transition-colors">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{p.project_name}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{BILLING_TYPE_LABELS[p.billing_type]}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-amber-700">{formatCurrency(p.outstanding, client.currency)}</p>
                      <p className="text-xs text-slate-400">outstanding</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── DETAILS ──────────────────────────────────────────────── */}
      {tab === 'details' && (
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
            {[
              { label: 'Client Code',     value: client.client_code,      mono: true },
              { label: 'Status',          value: client.status ?? 'active' },
              { label: 'Client Name',     value: client.name },
              { label: 'Company Name',    value: client.company_name },
              { label: 'Contact Person',  value: client.contact_person },
              { label: 'Email',           value: client.email },
              { label: 'Phone',           value: client.phone },
              { label: 'Alternate Phone', value: client.alternate_phone },
              { label: 'City',            value: client.city },
              { label: 'Country',         value: client.country },
              { label: 'TIN Number',      value: client.tin_number, mono: true },
              { label: 'Currency',        value: client.currency },
              { label: 'Billing Address', value: client.address, full: true },
              { label: 'Notes',           value: client.notes,    full: true },
              { label: 'Registered',      value: formatDate(client.created_at) },
              { label: 'Last Updated',    value: formatDate(client.updated_at) },
            ].map(({ label, value, mono, full }) => (
              <div key={label} className={full ? 'sm:col-span-2' : ''}>
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">{label}</p>
                <p className={`mt-1 text-sm text-slate-800 ${mono ? 'font-mono' : ''} ${!value ? 'text-slate-300' : ''}`}>
                  {value || '—'}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-5 pt-5 border-t border-slate-100">
            <button
              onClick={() => setEditing(true)}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              <Edit2 className="h-4 w-4" /> Edit Client Details
            </button>
          </div>
        </div>
      )}

      {/* ── PROJECTS ─────────────────────────────────────────────── */}
      {tab === 'projects' && (
        <div className="space-y-3">
          {projects.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
              <FolderOpen className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">No projects yet</p>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden hidden sm:block">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      {['Project', 'Billing', 'Invoiced', 'Paid', 'Outstanding', 'Status', ''].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {projects.map(p => (
                      <tr key={p.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-900">{p.project_name}</p>
                          <p className="text-xs text-slate-400 font-mono mt-0.5">{p.project_code}</p>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{BILLING_TYPE_LABELS[p.billing_type]}</td>
                        <td className="px-4 py-3 text-slate-700">{formatCurrency(p.total_invoiced, client.currency)}</td>
                        <td className="px-4 py-3 text-green-700">{formatCurrency(p.total_paid, client.currency)}</td>
                        <td className="px-4 py-3 font-medium text-amber-700">{formatCurrency(p.outstanding, client.currency)}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusColor[p.status]}`}>
                            {p.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Link href={`/projects/${p.id}`} className="text-blue-600 hover:text-blue-800 text-xs font-medium">View →</Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="sm:hidden space-y-3">
                {projects.map(p => (
                  <Link key={p.id} href={`/projects/${p.id}`}
                    className="block bg-white border border-slate-200 rounded-xl p-4 hover:border-blue-300 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-slate-900">{p.project_name}</p>
                        <p className="text-xs text-slate-400 font-mono mt-0.5">{p.project_code}</p>
                      </div>
                      <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusColor[p.status]}`}>
                        {p.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <p className="text-slate-400">Invoiced</p>
                        <p className="font-medium text-slate-700">{formatCurrency(p.total_invoiced, client.currency)}</p>
                      </div>
                      <div>
                        <p className="text-slate-400">Paid</p>
                        <p className="font-medium text-green-700">{formatCurrency(p.total_paid, client.currency)}</p>
                      </div>
                      <div>
                        <p className="text-slate-400">Outstanding</p>
                        <p className="font-medium text-amber-700">{formatCurrency(p.outstanding, client.currency)}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── INVOICES ─────────────────────────────────────────────── */}
      {tab === 'invoices' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          {invoices.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">No invoices yet</p>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      {['Invoice #', 'Date', 'Due', 'Total', 'Paid', 'Balance', 'Status', ''].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {invoices.map(inv => (
                      <tr key={inv.id} className={`hover:bg-slate-50 ${inv.status === 'void' ? 'opacity-40' : ''}`}>
                        <td className="px-4 py-3 font-mono text-xs text-slate-600">{inv.invoice_number}</td>
                        <td className="px-4 py-3 text-slate-600">{formatDate(inv.issue_date)}</td>
                        <td className="px-4 py-3 text-slate-500">{formatDate(inv.due_date)}</td>
                        <td className="px-4 py-3 font-medium text-slate-900">{formatCurrency(inv.total_amount, inv.currency)}</td>
                        <td className="px-4 py-3 text-green-700">{formatCurrency(inv.total_paid, inv.currency)}</td>
                        <td className="px-4 py-3 font-medium text-amber-700">{formatCurrency(inv.balance_due, inv.currency)}</td>
                        <td className="px-4 py-3"><StatusBadge status={inv.status} /></td>
                        <td className="px-4 py-3">
                          <Link href={`/invoices/${inv.id}`} className="text-blue-600 hover:text-blue-800 text-xs font-medium">View →</Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="sm:hidden divide-y divide-slate-100">
                {invoices.map(inv => (
                  <div key={inv.id} className={`p-4 ${inv.status === 'void' ? 'opacity-40' : ''}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-mono text-xs text-slate-500">{inv.invoice_number}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{formatDate(inv.issue_date)}{inv.due_date && ` · Due ${formatDate(inv.due_date)}`}</p>
                      </div>
                      <StatusBadge status={inv.status} />
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <p className="text-slate-400">Total</p>
                        <p className="font-semibold text-slate-900">{formatCurrency(inv.total_amount, inv.currency)}</p>
                      </div>
                      <div>
                        <p className="text-slate-400">Paid</p>
                        <p className="font-medium text-green-700">{formatCurrency(inv.total_paid, inv.currency)}</p>
                      </div>
                      <div>
                        <p className="text-slate-400">Balance</p>
                        <p className="font-medium text-amber-700">{formatCurrency(inv.balance_due, inv.currency)}</p>
                      </div>
                    </div>
                    <div className="mt-2 text-right">
                      <Link href={`/invoices/${inv.id}`} className="text-blue-600 text-xs font-medium">View →</Link>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── PAYMENTS ─────────────────────────────────────────────── */}
      {tab === 'payments' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          {payments.length === 0 ? (
            <div className="p-12 text-center">
              <CreditCard className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">No payments yet</p>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      {['Receipt #', 'Date', 'Invoice', 'Amount', 'Method', 'Reference', 'Status'].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {payments.map(pay => (
                      <tr key={pay.id} className={`hover:bg-slate-50 ${pay.status === 'reversed' ? 'opacity-50' : ''}`}>
                        <td className="px-4 py-3 font-mono text-xs text-slate-600">{pay.payment_number}</td>
                        <td className="px-4 py-3 text-slate-600">{formatDate(pay.payment_date)}</td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-500">{pay.invoice?.invoice_number}</td>
                        <td className={`px-4 py-3 font-semibold ${pay.status === 'reversed' ? 'text-slate-400 line-through' : 'text-green-700'}`}>
                          {formatCurrency(pay.amount_paid, client.currency)}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{PAYMENT_METHOD_LABELS[pay.payment_method]}</td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-400">{pay.reference_number || '—'}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${paymentStatusColor(pay.status ?? 'confirmed')}`}>
                            {pay.status ?? 'confirmed'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="sm:hidden divide-y divide-slate-100">
                {payments.map(pay => (
                  <div key={pay.id} className={`p-4 ${pay.status === 'reversed' ? 'opacity-50' : ''}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className={`text-base font-bold ${pay.status === 'reversed' ? 'text-slate-400 line-through' : 'text-green-700'}`}>
                          {formatCurrency(pay.amount_paid, client.currency)}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">{formatDate(pay.payment_date)}</p>
                      </div>
                      <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${paymentStatusColor(pay.status ?? 'confirmed')}`}>
                        {pay.status ?? 'confirmed'}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-500">
                      <span>{PAYMENT_METHOD_LABELS[pay.payment_method]}</span>
                      <span className="font-mono text-slate-400">{pay.invoice?.invoice_number}</span>
                      {pay.reference_number && <span className="font-mono">{pay.reference_number}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── STATEMENT ────────────────────────────────────────────── */}
      {tab === 'statement' && (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
          <FileDown className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-base font-semibold text-slate-700 mb-2">Client Statement</h3>
          <p className="text-sm text-slate-500 mb-6 max-w-sm mx-auto">
            Generate a full account statement showing all invoices, payments, and current balance for {client.name}.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              disabled
              className="inline-flex items-center gap-2 bg-blue-600 text-white text-sm font-medium px-5 py-2.5 rounded-lg opacity-40 cursor-not-allowed"
            >
              <FileDown className="h-4 w-4" /> Download PDF Statement
            </button>
            <p className="text-xs text-slate-400 self-center">PDF export coming in Phase 3F</p>
          </div>

          {/* Balance summary */}
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-lg mx-auto text-left">
            {[
              { label: 'Total Invoiced',  value: formatCurrency(totalBilled, client.currency),       color: 'text-slate-900' },
              { label: 'Total Received',  value: formatCurrency(totalPaid, client.currency),         color: 'text-green-700' },
              { label: 'Balance Due',     value: formatCurrency(totalOutstanding, client.currency),  color: 'text-amber-700' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                <p className="text-xs text-slate-400 font-medium">{label}</p>
                <p className={`text-lg font-bold mt-1 ${color}`}>{value}</p>
              </div>
            ))}
          </div>

          {/* Invoice list preview */}
          {activeInvoices.length > 0 && (
            <div className="mt-6 text-left max-w-lg mx-auto">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">{activeInvoices.length} active invoices</p>
              {activeInvoices.slice(0, 5).map(inv => (
                <div key={inv.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                  <div>
                    <p className="text-xs font-mono text-slate-600">{inv.invoice_number}</p>
                    <p className="text-xs text-slate-400">{STATUS_LABELS[inv.status]}</p>
                  </div>
                  <p className="text-xs font-medium text-amber-700">{formatCurrency(inv.balance_due, inv.currency)}</p>
                </div>
              ))}
              {activeInvoices.length > 5 && (
                <p className="text-xs text-slate-400 mt-2">+{activeInvoices.length - 5} more invoices</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Edit slide-over */}
      <EditClientPanel
        client={editing ? client : null}
        onClose={() => setEditing(false)}
        onSaved={updated => { setClient(updated); setEditing(false); }}
      />
    </div>
  );
}
