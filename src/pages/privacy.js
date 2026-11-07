import { renderPage } from '../components/page-shell.js';

renderPage({
  eyebrow: 'Data protection',
  title: 'Privacy policy',
  description: 'How FleetPulse handles information used to support fleet operations.',
  content: `
    <article class="placeholder-card p-4 p-md-5">
      <h2 class="h4">Information we use</h2>
      <p>FleetPulse uses account details, vehicle records, inspection submissions, shift reports, and maintenance information to operate the fleet management platform.</p>

      <h2 class="h4 mt-4">How information is protected</h2>
      <p>Access is restricted by authenticated role and database policies. Operational information is only presented to users whose role permits access. Privileged service keys and database credentials are never included in the browser application.</p>

      <h2 class="h4 mt-4">Storage and retention</h2>
      <p>Inspection photos, issue photos, and maintenance documents are stored only when submitted through an authorized workflow. Historical operational records are retained to support safety, maintenance, and audit requirements.</p>

      <h2 class="h4 mt-4">Contact</h2>
      <p class="mb-0">For privacy questions or requests concerning FleetPulse data, contact the organization responsible for your FleetPulse deployment.</p>
    </article>
  `,
});
