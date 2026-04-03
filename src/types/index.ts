export type Client = {
  id: string;
  client_code: string;
  name: string;
  company_name: string | null;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  tin_number: string | null;
  currency: string;
  notes: string | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
};

export type Service = {
  id: string;
  service_code: string;
  service_name: string;
  category: string | null;
  default_price: number;
  tax_percent: number;
  is_active: boolean;
  created_at: string;
};

export type Project = {
  id: string;
  client_id: string;
  project_code: string;
  project_name: string;
  description: string | null;
  total_contract_amount: number | null;
  billing_type: 'single_invoice' | 'installment' | 'milestone' | 'recurring';
  project_manager: string | null;
  status: 'active' | 'on_hold' | 'completed' | 'cancelled';
  start_date: string | null;
  end_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  client?: Client;
};

export type InvoiceSchedule = {
  id: string;
  project_id: string;
  schedule_name: string;
  description: string | null;
  percentage: number | null;
  fixed_amount: number | null;
  due_date: string | null;
  sort_order: number;
  status: 'pending' | 'invoiced' | 'paid';
  generated_invoice_id: string | null;
  created_at: string;
};

export type InvoiceStatus = 'draft' | 'sent' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled';

export type Invoice = {
  id: string;
  invoice_number: string;
  client_id: string;
  project_id: string | null;
  schedule_id: string | null;
  issue_date: string;
  due_date: string | null;
  currency: string;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  total_paid: number;
  balance_due: number;
  status: InvoiceStatus;
  notes: string | null;
  footer_note: string | null;
  pdf_url: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  client?: Client;
  project?: Project;
  invoice_items?: InvoiceItem[];
  payments?: Payment[];
};

export type InvoiceItem = {
  id: string;
  invoice_id: string;
  service_id: string | null;
  item_name: string;
  description: string | null;
  quantity: number;
  unit_price: number;
  discount_percent: number;
  tax_percent: number;
  line_total: number;
  sort_order: number;
  created_at: string;
  // Joined
  service?: Service;
};

export type PaymentMethod = 'bank_transfer' | 'mobile_money' | 'cash' | 'cheque' | 'online' | 'other';

export type Payment = {
  id: string;
  payment_number: string;
  invoice_id: string;
  payment_date: string;
  amount_paid: number;
  payment_method: PaymentMethod;
  reference_number: string | null;
  note: string | null;
  is_confirmed: boolean;
  receipt_url: string | null;
  created_at: string;
  // Joined
  invoice?: Invoice;
};

export type ReportSummary = {
  total_invoiced: number;
  total_paid: number;
  total_outstanding: number;
  total_overdue: number;
  count_draft: number;
  count_sent: number;
  count_partially_paid: number;
  count_paid: number;
  count_overdue: number;
  count_cancelled: number;
};
