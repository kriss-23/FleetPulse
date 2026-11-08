import { getAuthenticatedContext } from './auth.js';
import { supabaseClient } from './supabase-client.js';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function requireSupabase() {
  if (!supabaseClient) {
    throw new Error('Supabase is not configured. Set the VITE_SUPABASE_URL and publishable key.');
  }
}

async function requireAccountingAccess() {
  requireSupabase();
  const context = await getAuthenticatedContext();
  if (!context.user || !['accountant', 'manager'].includes(context.role)) {
    throw new Error('Accountant or Fleet Manager access is required for this portal.');
  }
}

function monthRange(date = new Date()) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 1);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

function parseInvoiceReference(reference) {
  if (!reference || typeof reference !== 'string') return null;
  const separator = reference.indexOf('/');
  if (separator <= 0 || separator === reference.length - 1) return null;
  const bucket = reference.slice(0, separator);
  const path = reference.slice(separator + 1);
  if (bucket !== 'invoices' || path.includes('..') || path.startsWith('/')) return null;
  return { bucket, path };
}

export async function fetchAccountantData(invoiceId = null, vehicleId = null) {
  await requireAccountingAccess();
  if (invoiceId && !UUID_PATTERN.test(invoiceId)) throw new Error('The invoice_id parameter is invalid.');
  if (vehicleId && !UUID_PATTERN.test(vehicleId)) throw new Error('The vehicle_id parameter is invalid.');
  const range = monthRange();
  const [maintenanceResult, summaryResult] = await Promise.all([
    supabaseClient.rpc('get_accountant_maintenance_records', {
      p_invoice_id: invoiceId,
      p_vehicle_id: vehicleId,
    }),
    supabaseClient.rpc('get_monthly_fleet_expense_summary', {
      p_month_start: range.start,
      p_month_end: range.end,
    }),
  ]);
  if (maintenanceResult.error) throw new Error(`Maintenance records could not be loaded: ${maintenanceResult.error.message}`);
  if (summaryResult.error) throw new Error(`Expense summary could not be loaded: ${summaryResult.error.message}`);
  return {
    maintenance: (maintenanceResult.data || []).map((record) => ({
      ...record,
      vehicle: {
        license_plate: record.license_plate,
        brand_model: record.brand_model,
      },
    })),
    summary: summaryResult.data,
    monthLabel: new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(new Date(`${range.start}T00:00:00`)),
  };
}

export async function createInvoiceLink(reference) {
  await requireAccountingAccess();
  const invoice = parseInvoiceReference(reference);
  if (!invoice) throw new Error('This invoice reference is not a valid private invoice path.');
  const { data, error } = await supabaseClient.storage.from(invoice.bucket).createSignedUrl(invoice.path, 300);
  if (error) throw new Error(`Invoice link could not be created: ${error.message}`);
  return data.signedUrl;
}
