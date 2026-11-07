import { renderPage } from '../components/page-shell.js';

renderPage({
  eyebrow: 'Legal information',
  title: 'Legal notice',
  description: 'Ownership, contact, and project information for FleetPulse.',
  content: `
    <article class="placeholder-card p-4 p-md-5">
      <h2 class="h4">Company</h2>
      <p><strong>FleetPulse Logistics Inc.</strong></p>
      <p>Registered address: 100 Operations Way, Sofia 1000, Bulgaria</p>
      <p>Contact email: <a href="mailto:contact@fleetpulse.example">contact@fleetpulse.example</a></p>
      <p>Legal representative: FleetPulse Project Team</p>

      <h2 class="h4 mt-4">Project disclaimer</h2>
      <p class="mb-0">FleetPulse is a student capstone project developed for SoftUni's “Software Technologies with AI” course. The company details and contact address on this page are educational project placeholders and do not represent a commercial service or registered legal entity.</p>
    </article>
  `,
});
