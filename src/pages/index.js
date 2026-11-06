import { renderPage } from '../components/page-shell.js';

renderPage({
  eyebrow: 'Authentication landing',
  title: 'Welcome to FleetPulse',
  description: 'Sign in or register to manage fleet operations from one place.',
  content: `
    <div class="row g-4">
      <div class="col-lg-7">
        <div class="placeholder-card p-4 p-md-5">
          <h2 class="h4">Login and registration</h2>
          <p class="text-secondary">Authentication workflows will be connected in a later milestone.</p>
          <div class="d-flex flex-wrap gap-2">
            <a class="btn btn-primary" href="/driver.html">Continue to Driver Dashboard</a>
            <a class="btn btn-outline-secondary" href="#register">Register</a>
          </div>
        </div>
      </div>
      <div class="col-lg-5">
        <div class="placeholder-card p-4">
          <h2 class="h5">FleetPulse roles</h2>
          <ul class="mb-0">
            <li>Fleet Manager</li>
            <li>Accountant</li>
            <li>Warehouse Specialist</li>
            <li>Driver</li>
          </ul>
        </div>
      </div>
    </div>
  `,
});
