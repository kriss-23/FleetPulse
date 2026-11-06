import { renderPage, selectedQueryValue } from '../components/page-shell.js';
import { escapeHtml } from '../utils/escape-html.js';
import { statusBadge } from '../components/status.js';

const vehicleId = escapeHtml(selectedQueryValue('vehicle_id') || 'No vehicle selected');

renderPage({
  eyebrow: 'Driver workspace',
  title: 'Driver Dashboard',
  description: 'Prepare for a trip and complete the pre-trip inspection check-in.',
  content: `
    <div class="placeholder-card p-4 p-md-5">
      <div class="d-flex flex-wrap justify-content-between gap-3">
        <div>
          <h2 class="h4">Pre-trip inspection</h2>
          <p class="text-secondary mb-0">Odometer readings and photo uploads will be connected in a later milestone.</p>
        </div>
        ${statusBadge('active')}
      </div>
      <hr>
      <p class="mb-0"><strong>Selected vehicle:</strong> ${vehicleId}</p>
    </div>
  `,
});
