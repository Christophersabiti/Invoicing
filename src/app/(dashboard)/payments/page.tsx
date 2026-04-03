'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Payment } from '@/types';
import { formatCurrency, formatDate, PAYMENT_METHOD_LABELS } from '@/lib/utils';
import { PageHeader } from '@/components/ui/PageHeader';
import { Search, CreditCard } from 'lucide-react';

export default function PaymentsPage() {
  const supabase = createClient();
  const [payments, setPayments] = useState<(Payment & { invoice: { invoice_number: string; client: { name: string } } })[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState('');

  const fetch = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('payments')
      .select('*, invoice:invoices(invoice_number, client:clients(name))')
      .order('payment_date', { ascending: false });
    if (methodFilter) query = query.eq('payment_method', methodFilter);
    const { data } = await query;
    setPayments((data || []) as (Payment & { invoice: { invoice_number: string; client: { name: string } } })[]);
    setLoading(false);
  }, [methodFilter]);

  useEffect(() => { fetch(); }, [fetch]);

  const filtered = payments.filter(p =>
    [p.payment_number, p.invoice?.invoice_number, p.invoice?.client?.name, p.reference_number]
      .some(v => v?.toLowerCase().includes(search.toLowerCase()))
  );

  const totalReceived = payments.reduce((s, p) => s + p.amount_paid, 0);

  return (
    <div>
      <PageHeader
        title="Payments"
        subtitle={`${payments.length} payment${payments.length !== 1 ? 's' : ''} recorded`}
      />

      <div className="bg-green-50 border border-green-200 rounded-xl p-5 mb-6 flex items-center gap-4">
        <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
          <CreditCard className="h-5 w-5 text-green-600" />
        </div>
        <div>
          <p className="text-xs text-green-600 font-medium">Total Received</p>
          <p className="text-2xl font-bold text-green-800">{formatCurrency(totalReceived)}</p>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search payments..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-56"
          />
        </div>
        <select
          value={methodFilter}
          onChange={e => setMethodFilter(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All methods</option>
          {Object.entries(PAYMENT_METHOD_LABELS).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-slate-400">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <CreditCard className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No payments found</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['Receipt #', 'Date', 'Client', 'Invoice', 'Amount', 'Method', 'Reference', 'Note'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(pay => (
                <tr key={pay.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">{pay.payment_number}</td>
                  <td className="px-4 py-3 text-slate-600">{formatDate(pay.payment_date)}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">{pay.invoice?.client?.name || '—'}</td>
                  <td className="px-4 py-3">
                    <Link href={`/invoices/${pay.invoice_id}`} className="font-mono text-xs text-blue-600 hover:underline">
                      {pay.invoice?.invoice_number}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-semibold text-green-700">{formatCurrency(pay.amount_paid)}</td>
                  <td className="px-4 py-3 text-slate-600">{PAYMENT_METHOD_LABELS[pay.payment_method]}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{pay.reference_number || '—'}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs max-w-32 truncate">{pay.note || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
