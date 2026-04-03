import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Server-side Supabase client using service role key
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function formatCurrency(amount: number, currency = 'UGX'): string {
  return new Intl.NumberFormat('en-UG', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = getSupabase();

  const [{ data: invoice }, { data: items }, { data: payments }] = await Promise.all([
    supabase
      .from('invoices')
      .select('*, client:clients(*), project:projects(project_name, project_code)')
      .eq('id', id)
      .single(),
    supabase
      .from('invoice_items')
      .select('*, service:services(service_name)')
      .eq('invoice_id', id)
      .order('sort_order'),
    supabase
      .from('payments')
      .select('*')
      .eq('invoice_id', id)
      .order('payment_date'),
  ]);

  if (!invoice) {
    return new NextResponse('Invoice not found', { status: 404 });
  }

  const client = invoice.client as {
    name: string;
    company_name?: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  const project = invoice.project as { project_name: string; project_code: string } | null;

  const statusLabel: Record<string, string> = {
    draft: 'DRAFT',
    sent: 'SENT',
    partially_paid: 'PARTIALLY PAID',
    paid: 'PAID',
    overdue: 'OVERDUE',
    cancelled: 'CANCELLED',
  };

  const statusColor: Record<string, string> = {
    draft: '#64748b',
    sent: '#2563eb',
    partially_paid: '#d97706',
    paid: '#16a34a',
    overdue: '#dc2626',
    cancelled: '#94a3b8',
  };

  const lineItemsHtml = (items || []).map((item: {
    item_name: string;
    description?: string;
    quantity: number;
    unit_price: number;
    discount_percent: number;
    tax_percent: number;
    line_total: number;
    service?: { service_name: string };
  }) => `
    <tr>
      <td>${item.service?.service_name || '—'}</td>
      <td>
        <strong>${item.item_name}</strong>
        ${item.description ? `<br><small style="color:#94a3b8">${item.description}</small>` : ''}
      </td>
      <td style="text-align:center">${item.quantity}</td>
      <td style="text-align:right">${formatCurrency(item.unit_price, invoice.currency)}</td>
      <td style="text-align:center">${item.discount_percent}%</td>
      <td style="text-align:center">${item.tax_percent}%</td>
      <td style="text-align:right;font-weight:600">${formatCurrency(item.line_total, invoice.currency)}</td>
    </tr>
  `).join('');

  const paymentsHtml = (payments || []).length > 0 ? `
    <div class="section">
      <h3>Payment History</h3>
      <table>
        <thead>
          <tr>
            <th>Receipt #</th>
            <th>Date</th>
            <th>Method</th>
            <th>Reference</th>
            <th style="text-align:right">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${(payments || []).map((p: {
            payment_number: string;
            payment_date: string;
            payment_method: string;
            reference_number?: string;
            amount_paid: number;
          }) => `
            <tr>
              <td style="font-family:monospace;font-size:11px">${p.payment_number}</td>
              <td>${formatDate(p.payment_date)}</td>
              <td style="text-transform:capitalize">${p.payment_method.replace(/_/g, ' ')}</td>
              <td style="font-family:monospace;font-size:11px">${p.reference_number || '—'}</td>
              <td style="text-align:right;color:#16a34a;font-weight:600">${formatCurrency(p.amount_paid, invoice.currency)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  ` : '';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${invoice.invoice_number} - Sabtech Online</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 13px;
      color: #0f172a;
      background: #fff;
      padding: 40px;
      max-width: 860px;
      margin: 0 auto;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 40px;
      padding-bottom: 24px;
      border-bottom: 2px solid #0f172a;
    }
    .company-name { font-size: 22px; font-weight: 800; color: #0f172a; }
    .company-sub { font-size: 11px; color: #64748b; margin-top: 4px; }
    .invoice-meta { text-align: right; }
    .invoice-number { font-size: 20px; font-weight: 700; color: #0f172a; }
    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.05em;
      margin-top: 6px;
      color: white;
      background: ${statusColor[invoice.status] || '#64748b'};
    }
    .meta-row { font-size: 12px; color: #64748b; margin-top: 4px; }
    .meta-row strong { color: #0f172a; }

    .billing-section {
      display: flex;
      gap: 40px;
      margin-bottom: 32px;
    }
    .billing-block { flex: 1; }
    .billing-label {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #94a3b8;
      margin-bottom: 8px;
    }
    .billing-name { font-size: 15px; font-weight: 700; }
    .billing-detail { font-size: 12px; color: #475569; margin-top: 2px; }

    .section { margin-bottom: 32px; }
    .section h3 {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #94a3b8;
      margin-bottom: 12px;
    }

    table { width: 100%; border-collapse: collapse; }
    thead tr { background: #f8fafc; }
    th {
      text-align: left;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #64748b;
      padding: 10px 12px;
      border-bottom: 1px solid #e2e8f0;
    }
    td {
      padding: 10px 12px;
      border-bottom: 1px solid #f1f5f9;
      vertical-align: top;
      font-size: 13px;
    }
    tbody tr:last-child td { border-bottom: none; }

    .totals {
      margin-left: auto;
      width: 300px;
      margin-bottom: 32px;
    }
    .totals-row {
      display: flex;
      justify-content: space-between;
      padding: 6px 0;
      font-size: 13px;
    }
    .totals-row.total {
      border-top: 2px solid #0f172a;
      margin-top: 6px;
      padding-top: 10px;
      font-weight: 700;
      font-size: 15px;
    }
    .totals-row.paid { color: #16a34a; font-weight: 600; }
    .totals-row.balance {
      background: ${invoice.balance_due > 0 ? '#fffbeb' : '#f0fdf4'};
      color: ${invoice.balance_due > 0 ? '#b45309' : '#15803d'};
      font-weight: 700;
      font-size: 15px;
      padding: 10px 12px;
      border-radius: 8px;
      margin-top: 8px;
    }

    .footer {
      border-top: 1px solid #e2e8f0;
      padding-top: 20px;
      font-size: 11px;
      color: #64748b;
    }
    .footer-note { margin-bottom: 8px; line-height: 1.6; }
    .generated { color: #94a3b8; font-size: 10px; }

    @media print {
      body { padding: 20px; }
      @page { margin: 1cm; }
    }
  </style>
</head>
<body>

  <!-- Header -->
  <div class="header">
    <div>
      <div class="company-name">Sabtech Online</div>
      <div class="company-sub">Professional Digital Services</div>
    </div>
    <div class="invoice-meta">
      <div class="invoice-number">${invoice.invoice_number}</div>
      <div><span class="status-badge">${statusLabel[invoice.status] || invoice.status.toUpperCase()}</span></div>
      <div class="meta-row">Issue Date: <strong>${formatDate(invoice.issue_date)}</strong></div>
      ${invoice.due_date ? `<div class="meta-row">Due Date: <strong>${formatDate(invoice.due_date)}</strong></div>` : ''}
      <div class="meta-row">Currency: <strong>${invoice.currency}</strong></div>
    </div>
  </div>

  <!-- Billing To / Project -->
  <div class="billing-section">
    <div class="billing-block">
      <div class="billing-label">Billed To</div>
      <div class="billing-name">${client.name}</div>
      ${client.company_name ? `<div class="billing-detail">${client.company_name}</div>` : ''}
      ${client.email ? `<div class="billing-detail">${client.email}</div>` : ''}
      ${client.phone ? `<div class="billing-detail">${client.phone}</div>` : ''}
      ${client.address ? `<div class="billing-detail" style="margin-top:4px;white-space:pre-line">${client.address}</div>` : ''}
    </div>
    ${project ? `
    <div class="billing-block">
      <div class="billing-label">Project</div>
      <div class="billing-name">${project.project_name}</div>
      <div class="billing-detail" style="font-family:monospace">${project.project_code}</div>
    </div>
    ` : ''}
  </div>

  <!-- Line Items -->
  <div class="section">
    <h3>Invoice Items</h3>
    <table>
      <thead>
        <tr>
          <th>Service</th>
          <th>Item / Description</th>
          <th style="text-align:center">Qty</th>
          <th style="text-align:right">Unit Price</th>
          <th style="text-align:center">Disc%</th>
          <th style="text-align:center">Tax%</th>
          <th style="text-align:right">Total</th>
        </tr>
      </thead>
      <tbody>
        ${lineItemsHtml || '<tr><td colspan="7" style="text-align:center;color:#94a3b8">No items</td></tr>'}
      </tbody>
    </table>
  </div>

  <!-- Totals -->
  <div class="totals">
    <div class="totals-row">
      <span>Subtotal</span>
      <span>${formatCurrency(invoice.subtotal, invoice.currency)}</span>
    </div>
    ${invoice.discount_amount > 0 ? `
    <div class="totals-row" style="color:#16a34a">
      <span>Discount</span>
      <span>−${formatCurrency(invoice.discount_amount, invoice.currency)}</span>
    </div>
    ` : ''}
    ${invoice.tax_amount > 0 ? `
    <div class="totals-row">
      <span>Tax</span>
      <span>${formatCurrency(invoice.tax_amount, invoice.currency)}</span>
    </div>
    ` : ''}
    <div class="totals-row total">
      <span>Invoice Total</span>
      <span>${formatCurrency(invoice.total_amount, invoice.currency)}</span>
    </div>
    ${invoice.total_paid > 0 ? `
    <div class="totals-row paid">
      <span>Amount Paid</span>
      <span>${formatCurrency(invoice.total_paid, invoice.currency)}</span>
    </div>
    ` : ''}
    <div class="totals-row balance">
      <span>Balance Due</span>
      <span>${formatCurrency(invoice.balance_due, invoice.currency)}</span>
    </div>
  </div>

  <!-- Payment History -->
  ${paymentsHtml}

  <!-- Footer -->
  <div class="footer">
    ${invoice.footer_note ? `<div class="footer-note">${invoice.footer_note}</div>` : ''}
    <div class="generated">
      Generated by Sabtech Online Invoicing System · ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
    </div>
  </div>

</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  });
}
