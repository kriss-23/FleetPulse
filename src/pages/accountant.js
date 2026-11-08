import { renderPage, selectedQueryValue } from '../components/page-shell.js';
import { emptyState, loadingSkeleton, showToast } from '../components/feedback.js';
import { escapeHtml } from '../utils/escape-html.js';
import { createInvoiceLink, fetchAccountantData } from '../services/accountant-service.js';

renderPage({
  eyebrow: 'Finance workspace',
  title: 'Accountant Invoice Portal',
  description: 'Review service invoices and exact monthly fleet expense totals.',
  content: `<section id="accountant-content" aria-live="polite">${loadingSkeleton(5)}</section>`,
});

const content = document.querySelector('#accountant-content');

function formatCurrency(value) {
  const raw = String(value ?? '0').replace(',', '.');
  const [integerPart = '0', decimalPart = ''] = raw.split('.');
  const sign = integerPart.startsWith('-') ? '-' : '';
  const absoluteInteger = integerPart.replace('-', '').replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${sign}${absoluteInteger}.${decimalPart.padEnd(2, '0').slice(0, 2)}`;
}

function formatDate(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value));
}

function statusBadge(status) {
  const style = { pending: 'warning', approved: 'success', completed: 'primary' }[status] || 'secondary';
  return `<span class="badge text-bg-${style}">${escapeHtml(status)}</span>`;
}

function renderPortal(data) {
  const selectedId = selectedQueryValue('invoice_id');
  const rows = data.maintenance.map((record) => `
    <tr${record.id === selectedId ? ' class="table-active"' : ''}>
      <th scope="row">${escapeHtml(record.vehicle?.license_plate || '—')}<br><span class="text-secondary fw-normal">${escapeHtml(record.vehicle?.brand_model || 'Vehicle')}</span></th>
      <td>${formatCurrency(record.service_cost)}</td>
      <td>${statusBadge(record.status)}</td>
      <td>${formatDate(record.created_at)}</td>
      <td>${formatDate(record.updated_at)}</td>
      <td class="text-end">${record.invoice_pdf_url ? `<button class="btn btn-sm btn-outline-primary" type="button" data-invoice-reference="${escapeHtml(record.invoice_pdf_url)}"><i class="bi bi-file-earmark-pdf me-1" aria-hidden="true"></i>View invoice</button>` : '<span class="text-secondary">No file</span>'}</td>
    </tr>
  `).join('');
  const mobileInvoices = data.maintenance.map((record) => `<article class="data-card"><div class="data-card-heading"><div><strong>${escapeHtml(record.vehicle?.license_plate || '—')}</strong><span>${escapeHtml(record.vehicle?.brand_model || 'Vehicle')}</span></div>${statusBadge(record.status)}</div><div><span class="data-card-label">Service cost</span><strong>${formatCurrency(record.service_cost)}</strong></div><div><span class="data-card-label">Created</span><strong>${formatDate(record.created_at)}</strong></div><div><span class="data-card-label">Invoice</span>${record.invoice_pdf_url ? `<button class="btn btn-sm btn-outline-primary" type="button" data-invoice-reference="${escapeHtml(record.invoice_pdf_url)}">View invoice</button>` : '<span class="text-secondary">No file</span>'}</div></article>`).join('');

  content.innerHTML = `
    <div class="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
      <p class="mb-0 text-secondary">Current period: <strong>${escapeHtml(data.monthLabel)}</strong></p>
      <button class="btn btn-outline-primary" type="button" id="refresh-accountant"><i class="bi bi-arrow-clockwise me-1" aria-hidden="true"></i>Refresh data</button>
    </div>
    <div class="row g-3 mb-4">
      <div class="col-md-4"><article class="summary-card summary-maintenance"><div class="summary-card-icon"><i class="bi bi-tools" aria-hidden="true"></i></div><div><p class="summary-card-label">Monthly maintenance</p><p class="summary-card-value">${formatCurrency(data.summary?.maintenance_total)}</p></div></article></div>
      <div class="col-md-4"><article class="summary-card summary-neutral"><div class="summary-card-icon"><i class="bi bi-fuel-pump" aria-hidden="true"></i></div><div><p class="summary-card-label">Monthly fuel</p><p class="summary-card-value">${formatCurrency(data.summary?.fuel_total)}</p></div></article></div>
      <div class="col-md-4"><article class="summary-card summary-active"><div class="summary-card-icon"><i class="bi bi-calculator" aria-hidden="true"></i></div><div><p class="summary-card-label">Total fleet expenses</p><p class="summary-card-value">${formatCurrency(data.summary?.combined_total)}</p></div></article></div>
    </div>
    <article class="chart-card mb-4" aria-labelledby="expense-chart-title"><div class="d-flex justify-content-between align-items-center mb-3"><h2 class="h6 mb-0" id="expense-chart-title">Monthly expense breakdown</h2><span class="small text-secondary">${escapeHtml(data.monthLabel)}</span></div><div class="chart-bars"><div class="chart-bar-row"><span>Maintenance</span><div class="chart-bar-track"><span class="chart-bar chart-bar-maintenance" style="width:${Number(data.summary?.combined_total) ? (Number(data.summary?.maintenance_total) / Number(data.summary.combined_total)) * 100 : 0}%"></span></div><strong>${formatCurrency(data.summary?.maintenance_total)}</strong></div><div class="chart-bar-row"><span>Fuel</span><div class="chart-bar-track"><span class="chart-bar chart-bar-active" style="width:${Number(data.summary?.combined_total) ? (Number(data.summary?.fuel_total) / Number(data.summary.combined_total)) * 100 : 0}%"></span></div><strong>${formatCurrency(data.summary?.fuel_total)}</strong></div></div></article>
    <div class="placeholder-card p-0 overflow-hidden">
      <div class="p-4 pb-2"><h2 class="h4 mb-1">Maintenance invoices</h2><p class="text-secondary mb-0">Read-only financial records with short-lived private invoice links.</p></div>
      ${data.maintenance.length ? `<div class="desktop-table table-responsive"><table class="table align-middle mb-0"><caption class="visually-hidden">Fleet maintenance invoices</caption><thead><tr><th scope="col">Vehicle</th><th scope="col">Service cost</th><th scope="col">Status</th><th scope="col">Created</th><th scope="col">Updated</th><th scope="col" class="text-end">Invoice</th></tr></thead><tbody>${rows}</tbody></table></div><div class="mobile-card-list">${mobileInvoices}</div>` : emptyState({ icon: 'bi-receipt', title: 'No maintenance records', message: 'Maintenance invoices will appear here when they are recorded.' })}
    </div>
  `;
  document.querySelector('#refresh-accountant').addEventListener('click', load);
  content.querySelectorAll('[data-invoice-reference]').forEach((button) => {
    button.addEventListener('click', async () => {
      button.disabled = true;
      try {
        const url = await createInvoiceLink(button.dataset.invoiceReference);
        window.open(url, '_blank', 'noopener,noreferrer');
      } catch (error) {
        showToast(error.message, { title: 'Invoice unavailable', variant: 'danger' });
      } finally {
        button.disabled = false;
      }
    });
  });
}

async function load() {
  content.innerHTML = loadingSkeleton(5);
  try {
    renderPortal(await fetchAccountantData(selectedQueryValue('invoice_id'), selectedQueryValue('vehicle_id')));
  } catch (error) {
    content.innerHTML = emptyState({ icon: 'bi-shield-lock', title: 'Accountant access required', message: error.message });
    showToast(error.message, { title: 'Accountant portal unavailable', variant: 'danger' });
  }
}

load();
