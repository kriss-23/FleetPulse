import { renderPage, selectedQueryValue } from '../components/page-shell.js';
import { escapeHtml } from '../utils/escape-html.js';

const invoiceId = escapeHtml(selectedQueryValue('invoice_id') || 'No invoice selected');

renderPage({
  eyebrow: 'Finance workspace',
  title: 'Accountant Invoice Portal',
  description: 'Review fleet invoices and expenses in one focused workspace.',
  content: `
    <div class="placeholder-card p-4 p-md-5">
      <h2 class="h4">Invoice and expense portal</h2>
      <p class="text-secondary">Invoice records and expense workflows will be connected in a later milestone.</p>
      <p class="mb-0"><strong>Selected invoice:</strong> ${invoiceId}</p>
    </div>
  `,
});
