import { renderPage } from '../components/page-shell.js';

renderPage({
  eyebrow: 'Support information',
  title: 'Frequently asked questions',
  description: 'Operational answers for FleetPulse users and evaluators.',
  content: `
    <div class="accordion" id="faq-list">
      <div class="accordion-item">
        <h2 class="accordion-header"><button class="accordion-button" type="button" data-bs-toggle="collapse" data-bs-target="#faq-purpose" aria-expanded="true" aria-controls="faq-purpose">What is FleetPulse and who is it for?</button></h2>
        <div id="faq-purpose" class="accordion-collapse collapse show" data-bs-parent="#faq-list"><div class="accordion-body">FleetPulse is a logistics dashboard for fleet managers, accountants, warehouse specialists, and drivers. It brings vehicle status, assignments, inspections, reports, and maintenance records into one operational workspace.</div></div>
      </div>
      <div class="accordion-item">
        <h2 class="accordion-header"><button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#faq-status" aria-expanded="false" aria-controls="faq-status">How does the traffic-light vehicle status system work?</button></h2>
        <div id="faq-status" class="accordion-collapse collapse" data-bs-parent="#faq-list"><div class="accordion-body">🟢 Active vehicles are ready for routes. 🟡 Maintenance vehicles are scheduled for service and cannot receive new assignments. 🔴 Out of Service vehicles require urgent repair and are blocked from route operations.</div></div>
      </div>
      <div class="accordion-item">
        <h2 class="accordion-header"><button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#faq-hours" aria-expanded="false" aria-controls="faq-hours">How are daily shifts and the 9-hour legal driving limit enforced?</button></h2>
        <div id="faq-hours" class="accordion-collapse collapse" data-bs-parent="#faq-list"><div class="accordion-body">Shift reports are checked server-side by driver and shift date. The reporting engine aggregates driving time transactionally and rejects submissions that would exceed the nine-hour daily limit.</div></div>
      </div>
      <div class="accordion-item">
        <h2 class="accordion-header"><button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#faq-demo" aria-expanded="false" aria-controls="faq-demo">How can evaluators test different roles?</button></h2>
        <div id="faq-demo" class="accordion-collapse collapse" data-bs-parent="#faq-list"><div class="accordion-body">On the home page, use Quick Demo Login to fill the seeded Fleet Manager, Accountant, Warehouse Specialist, or Driver email. Enter the configured demo password and sign in. The account role determines the destination and navigation links.</div></div>
      </div>
      <div class="accordion-item">
        <h2 class="accordion-header"><button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#faq-storage" aria-expanded="false" aria-controls="faq-storage">How are inspection photos and maintenance invoices handled?</button></h2>
        <div id="faq-storage" class="accordion-collapse collapse" data-bs-parent="#faq-list"><div class="accordion-body">Files are uploaded to private Supabase Storage buckets through authenticated workflows. Database policies and Storage policies restrict access by role and ownership; privileged service keys are never sent to the browser.</div></div>
      </div>
    </div>
  `,
});
