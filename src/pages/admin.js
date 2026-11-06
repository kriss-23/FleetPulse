import { renderPage, selectedQueryValue } from '../components/page-shell.js';
import { escapeHtml } from '../utils/escape-html.js';

const vehicleId = escapeHtml(selectedQueryValue('vehicle_id') || 'No vehicle selected');

renderPage({
  eyebrow: 'Fleet management',
  title: 'Manager Admin Panel',
  description: 'Review vehicle readiness and manage driver assignments.',
  content: `
    <div class="placeholder-card p-4 p-md-5">
      <h2 class="h4">Vehicle assignment</h2>
      <p class="text-secondary">Fleet records, service logs, and assignments will be connected in a later milestone.</p>
      <p class="mb-0"><strong>Selected vehicle:</strong> ${vehicleId}</p>
    </div>
  `,
});
