'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Project, Invoice, InvoiceSchedule, Client } from '@/types';
import { formatCurrency, formatDate, BILLING_TYPE_LABELS } from '@/lib/utils';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ArrowLeft, Plus, X } from 'lucide-react';

type Tab = 'overview' | 'invoices' | 'schedule' | 'payments';

export default function ProjectProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();
  const [project, setProject] = useState<Project & { client: Client } | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [schedules, setSchedules] = useState<InvoiceSchedule[]>([]);
  const [tab, setTab] = useState<Tab>('overview');
  const [loading, setLoading] = useState(true);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({ schedule_name: '', description: '', percentage: '', fixed_amount: '', due_date: '' });
  const [savingSchedule, setSavingSchedule] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: proj }, { data: inv }, { data: sched }] = await Promise.all([
      supabase.from('projects').select('*, client:clients(*)').eq('id', id).single(),
      supabase.from('invoices').select('*').eq('project_id', id).order('issue_date', { ascending: false }),
      supabase.from('invoice_schedules').select('*').eq('project_id', id).order('sort_order'),
    ]);
    setProject(proj as Project & { client: Client });
    setInvoices(inv || []);
    setSchedules(sched || []);
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function addScheduleLine(e: React.FormEvent) {
    e.preventDefault();
    setSavingSchedule(true);
    const { error } = await supabase.from('invoice_schedules').insert({
      project_id: id,
      schedule_name: scheduleForm.schedule_name,
      description: scheduleForm.description || null,
      percentage: scheduleForm.percentage ? parseFloat(scheduleForm.percentage) : null,
      fixed_amount: scheduleForm.fixed_amount ? parseFloat(scheduleForm.fixed_amount) : null,
      due_date: scheduleForm.due_date || null,
      sort_order: schedules.length,
    });
    if (!error) {
      setShowScheduleForm(false);
      setScheduleForm({ schedule_name: '', description: '', percentage: '', fixed_amount: '', due_date: '' });
      load();
    } else {
      alert('Error: ' + error.message);
    }
    setSavingSchedule(false);
  }

  if (loading) return <div className="p-12 text-center text-slate-400">Loading...</div>;
  if (!project) return <div className="p-12 text-center text-red-500">Project not found</div>;

  const totalBilled = invoices.reduce((s, i) => s + (i.total_amount || 0), 0);
  const totalPaid = invoices.reduce((s, i) => s + (i.total_paid || 0), 0);
  const totalOutstanding = invoices.reduce((s, i) => s + (i.balance_due || 0), 0);

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'invoices', label: `Invoices (${invoices.length})` },
    { id: 'schedule', label: 'Billing Schedule' },
  ];

  const statusColor: Record<string, string> = {
    active: 'bg-green-100 text-green-700',
    on_hold: 'bg-amber-100 text-amber-700',
    completed: 'bg-blue-100 text-blue-700',
    cancelled: 'bg-slate-100 text-slate-500',
  };

  return (
    <div>
      <div className="mb-6">
        <button onClick={() => router.back()} className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-4">
          <ArrowLeft className="h-4 w-4" /> Back to Projects
        </button>
        <PageHeader
          title={project.project_name}
          subtitle={`${project.project_code} · ${project.client?.name}`}
          action={
            <Link
              href={`/invoices/new?project=${project.id}&client=${project.client_id}`}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg"
            >
              + New Invoice
            </Link>
          }
        />
      </div>

      {/* Billing Summary */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Contract Amount', value: project.total_contract_amount ? formatCurrency(project.total_contract_amount) : '—', color: 'bg-slate-50 border-slate-200 text-slate-800' },
          { label: 'Total Billed', value: formatCurrency(totalBilled), color: 'bg-blue-50 border-blue-200 text-blue-800' },
          { label: 'Total Paid', value: formatCurrency(totalPaid), color: 'bg-green-50 border-green-200 text-green-800' },
          { label: 'Outstanding', value: formatCurrency(totalOutstanding), color: 'bg-amber-50 border-amber-200 text-amber-800' },
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
                tab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {tab === 'overview' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 grid grid-cols-2 gap-6">
          {[
            { label: 'Project Code', value: project.project_code },
            { label: 'Client', value: project.client?.name },
            { label: 'Billing Type', value: BILLING_TYPE_LABELS[project.billing_type] },
            { label: 'Status', value: <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusColor[project.status]}`}>{project.status.replace('_', ' ')}</span> },
            { label: 'Project Manager', value: project.project_manager },
            { label: 'Start Date', value: formatDate(project.start_date) },
            { label: 'End Date', value: formatDate(project.end_date) },
            { label: 'Description', value: project.description },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">{label}</p>
              <p className="mt-1 text-sm text-slate-800">{value || '—'}</p>
            </div>
          ))}
        </div>
      )}

      {tab === 'invoices' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['Invoice #', 'Date', 'Due Date', 'Total', 'Paid', 'Balance', 'Status', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoices.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-400">No invoices for this project yet</td></tr>
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
                    <Link href={`/invoices/${inv.id}`} className="text-blue-600 text-xs hover:text-blue-800">View →</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'schedule' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setShowScheduleForm(true)}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg"
            >
              <Plus className="h-4 w-4" /> Add Schedule Line
            </button>
          </div>

          {schedules.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-slate-400">
              No billing schedule defined. Add lines for deposit, milestone, and final payment.
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    {['Stage', 'Description', '%', 'Fixed Amount', 'Due Date', 'Status', 'Invoice', ''].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {schedules.map(s => {
                    const computedAmount = s.fixed_amount || (project.total_contract_amount && s.percentage ? project.total_contract_amount * s.percentage / 100 : null);
                    return (
                      <tr key={s.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium text-slate-900">{s.schedule_name}</td>
                        <td className="px-4 py-3 text-slate-600">{s.description || '—'}</td>
                        <td className="px-4 py-3 text-slate-600">{s.percentage ? `${s.percentage}%` : '—'}</td>
                        <td className="px-4 py-3 text-slate-700">{computedAmount ? formatCurrency(computedAmount) : '—'}</td>
                        <td className="px-4 py-3 text-slate-600">{formatDate(s.due_date)}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            s.status === 'paid' ? 'bg-green-100 text-green-700' :
                            s.status === 'invoiced' ? 'bg-blue-100 text-blue-700' :
                            'bg-slate-100 text-slate-600'
                          }`}>{s.status}</span>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs">
                          {s.generated_invoice_id ? (
                            <Link href={`/invoices/${s.generated_invoice_id}`} className="text-blue-600 hover:underline">View Invoice</Link>
                          ) : '—'}
                        </td>
                        <td className="px-4 py-3">
                          {s.status === 'pending' && (
                            <Link
                              href={`/invoices/new?project=${id}&client=${project.client_id}&schedule=${s.id}&amount=${computedAmount || ''}`}
                              className="text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 px-2 py-1 rounded"
                            >
                              Generate Invoice
                            </Link>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {showScheduleForm && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
                <div className="flex items-center justify-between p-6 border-b border-slate-200">
                  <h2 className="text-lg font-semibold">Add Schedule Line</h2>
                  <button onClick={() => setShowScheduleForm(false)}><X className="h-5 w-5 text-slate-400" /></button>
                </div>
                <form onSubmit={addScheduleLine} className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Stage Name *</label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. Deposit, Design Approval, Final Delivery"
                      value={scheduleForm.schedule_name}
                      onChange={e => setScheduleForm(f => ({ ...f, schedule_name: e.target.value }))}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                    <input
                      type="text"
                      value={scheduleForm.description}
                      onChange={e => setScheduleForm(f => ({ ...f, description: e.target.value }))}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Percentage (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={scheduleForm.percentage}
                        onChange={e => setScheduleForm(f => ({ ...f, percentage: e.target.value }))}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Fixed Amount</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={scheduleForm.fixed_amount}
                        onChange={e => setScheduleForm(f => ({ ...f, fixed_amount: e.target.value }))}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Due Date</label>
                    <input
                      type="date"
                      value={scheduleForm.due_date}
                      onChange={e => setScheduleForm(f => ({ ...f, due_date: e.target.value }))}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => setShowScheduleForm(false)} className="flex-1 border border-slate-200 text-slate-700 py-2 rounded-lg text-sm">Cancel</button>
                    <button type="submit" disabled={savingSchedule} className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50">
                      {savingSchedule ? 'Saving...' : 'Add Line'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
