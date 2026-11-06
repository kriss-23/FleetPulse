import { renderPage } from '../components/page-shell.js';
import { emptyState } from '../components/feedback.js';

renderPage({
  eyebrow: 'Driver workspace',
  title: 'Daily Shift Report',
  description: 'Record shift activity and flag issues for follow-up.',
  content: `
    <div class="placeholder-card p-4 p-md-5">
      <h2 class="h4">End-of-shift report</h2>
      <p class="text-secondary">Driving hours, mileage, fuel or battery level, and issue logging will be connected in a later milestone.</p>
      ${emptyState({ icon: 'bi-clipboard2-check', title: 'No shift report selected', message: 'A completed report will appear here after the reporting workflow is connected.' })}
      <a class="btn btn-primary" href="/driver.html">Back to Driver Dashboard</a>
    </div>
  `,
});
