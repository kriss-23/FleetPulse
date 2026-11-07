import { renderPage } from '../components/page-shell.js';
import { emptyState, loadingSkeleton, showToast } from '../components/feedback.js';
import { statusBadge } from '../components/status.js';
import { escapeHtml } from '../utils/escape-html.js';
import { fetchDriverFilterOptions, fetchFleetOverview } from '../services/fleet-service.js';
import { getRoleRedirect, getUserRole, signIn, signUp } from '../services/auth.js';

const appContent = `
  <section class="fleet-hero mb-4 mb-lg-5" aria-labelledby="fleet-overview-title">
    <div class="fleet-hero-content">
      <p class="eyebrow mb-2">Fleet operations platform</p>
      <h2 id="fleet-overview-title">Fleet &amp; Vehicle Equipment Tracker</h2>
      <p class="mb-0">FleetPulse gives operations teams a clear, real-time view of vehicle readiness, assignments, and service priorities.</p>
    </div>
    <div class="fleet-hero-mark" aria-hidden="true"><i class="bi bi-truck"></i></div>
  </section>

  <section class="auth-shell placeholder-card p-4 p-md-5 mb-4 mb-lg-5" aria-labelledby="auth-title">
    <div class="row g-4 align-items-start">
      <div class="col-lg-5">
        <p class="eyebrow mb-2">Secure access</p>
        <h2 id="auth-title" class="h4">Access your FleetPulse workspace</h2>
        <p class="text-secondary mb-4">Sign in for role-specific fleet operations, or create a new Driver account.</p>
        <div class="demo-card">
          <p class="eyebrow mb-2">Evaluator access</p>
          <h3 class="h6">🚀 Quick Demo Login</h3>
          <p class="small text-secondary">Fill a seeded demo account into the sign-in form. The demo password is read from <code>VITE_DEMO_PASSWORD</code>.</p>
          <div class="demo-login-grid">
            <button class="btn btn-sm btn-outline-secondary" type="button" data-demo-role="manager">Fleet Manager</button>
            <button class="btn btn-sm btn-outline-secondary" type="button" data-demo-role="accountant">Accountant</button>
            <button class="btn btn-sm btn-outline-secondary" type="button" data-demo-role="warehouse">Warehouse Specialist</button>
            <button class="btn btn-sm btn-outline-secondary" type="button" data-demo-role="driver">Driver</button>
          </div>
        </div>
      </div>
      <div class="col-lg-7">
        <div class="auth-tabs btn-group mb-4" role="tablist" aria-label="Authentication">
          <a class="btn btn-primary" id="login-tab" href="#login" role="tab" aria-controls="login-panel">Sign in</a>
          <a class="btn btn-outline-primary" id="register-tab" href="#register" role="tab" aria-controls="register-panel">Register</a>
        </div>
        <div id="login-panel" role="tabpanel" aria-labelledby="login-tab">
          <form id="login-form" novalidate>
            <div class="mb-3">
              <label class="form-label" for="login-email">Email address</label>
              <input class="form-control" id="login-email" type="email" autocomplete="email" required>
              <div class="invalid-feedback">Enter a valid email address.</div>
            </div>
            <div class="mb-3">
              <label class="form-label" for="login-password">Password</label>
              <div class="input-group">
                <input class="form-control" id="login-password" type="password" autocomplete="current-password" minlength="8" required>
                <button class="btn btn-outline-secondary password-toggle" type="button" data-password-toggle="#login-password" aria-label="Show password" aria-pressed="false"><i class="bi bi-eye" aria-hidden="true"></i><span class="visually-hidden">Show password</span></button>
              </div>
              <div class="invalid-feedback">Enter your password.</div>
            </div>
            <button class="btn btn-primary" type="submit"><i class="bi bi-box-arrow-in-right me-1" aria-hidden="true"></i>Sign in</button>
          </form>
        </div>
        <div id="register-panel" class="d-none" role="tabpanel" aria-labelledby="register-tab">
          <form id="register-form" novalidate>
            <div class="mb-3">
              <label class="form-label" for="register-name">Full name</label>
              <input class="form-control" id="register-name" type="text" autocomplete="name" minlength="2" maxlength="120" required>
              <div class="invalid-feedback">Enter your full name.</div>
            </div>
            <div class="mb-3">
              <label class="form-label" for="register-email">Email address</label>
              <input class="form-control" id="register-email" type="email" autocomplete="email" required>
              <div class="invalid-feedback">Enter a valid email address.</div>
            </div>
            <div class="row g-3">
              <div class="col-md-6">
                <label class="form-label" for="register-password">Password</label>
                <div class="input-group">
                  <input class="form-control" id="register-password" type="password" autocomplete="new-password" minlength="8" required>
                  <button class="btn btn-outline-secondary password-toggle" type="button" data-password-toggle="#register-password" aria-label="Show password" aria-pressed="false"><i class="bi bi-eye" aria-hidden="true"></i><span class="visually-hidden">Show password</span></button>
                </div>
                <div class="invalid-feedback">Use at least 8 characters.</div>
              </div>
              <div class="col-md-6">
                <label class="form-label" for="register-confirm-password">Confirm password</label>
                <div class="input-group">
                  <input class="form-control" id="register-confirm-password" type="password" autocomplete="new-password" minlength="8" required>
                  <button class="btn btn-outline-secondary password-toggle" type="button" data-password-toggle="#register-confirm-password" aria-label="Show password" aria-pressed="false"><i class="bi bi-eye" aria-hidden="true"></i><span class="visually-hidden">Show password</span></button>
                </div>
                <div class="invalid-feedback">Passwords must match.</div>
              </div>
            </div>
            <button class="btn btn-outline-primary mt-3" type="submit"><i class="bi bi-person-plus me-1" aria-hidden="true"></i>Register</button>
          </form>
        </div>
      </div>
    </div>
  </section>

  <section aria-labelledby="fleet-status-title" class="mb-4 mb-lg-5">
    <div class="d-flex flex-wrap justify-content-between align-items-end gap-2 mb-3">
      <div>
        <p class="eyebrow mb-1">Operational snapshot</p>
        <h2 id="fleet-status-title" class="h4 mb-0">Fleet status</h2>
      </div>
      <span class="small text-secondary" id="fleet-updated">Loading live data…</span>
    </div>
    <div class="row g-3" id="fleet-summary" aria-live="polite">
      ${loadingSkeleton(4)}
    </div>
  </section>

  <section aria-labelledby="vehicle-list-title">
    <div class="d-flex flex-wrap justify-content-between align-items-end gap-3 mb-3">
      <div>
        <p class="eyebrow mb-1">Equipment register</p>
        <h2 id="vehicle-list-title" class="h4 mb-0">Company vehicles</h2>
      </div>
      <div class="d-flex flex-column flex-sm-row gap-2 fleet-filters">
        <label class="visually-hidden" for="vehicle-search">Search vehicles</label>
        <div class="input-group">
          <span class="input-group-text"><i class="bi bi-search" aria-hidden="true"></i></span>
          <input class="form-control" id="vehicle-search" type="search" placeholder="Search plate or model" autocomplete="off">
        </div>
        <label class="visually-hidden" for="status-filter">Filter by status</label>
        <select class="form-select" id="status-filter">
          <option value="all">All statuses</option>
          <option value="active">Active 🟢</option>
          <option value="maintenance">Maintenance 🟡</option>
          <option value="out_of_service">Out of Service 🔴</option>
        </select>
        <label class="visually-hidden" for="driver-filter">Filter by assigned driver</label>
        <select class="form-select" id="driver-filter">
          <option value="">All assigned drivers</option>
        </select>
        <label class="visually-hidden" for="sort-filter">Sort vehicles</label>
        <select class="form-select" id="sort-filter">
          <option value="updated_at:desc">Recently updated</option>
          <option value="mileage:desc">Mileage: highest first</option>
          <option value="mileage:asc">Mileage: lowest first</option>
          <option value="fuel_battery_level:desc">Fuel / battery: highest first</option>
          <option value="fuel_battery_level:asc">Fuel / battery: lowest first</option>
        </select>
      </div>
    </div>
    <div id="vehicle-list" aria-live="polite">${loadingSkeleton(3)}</div>
  </section>
`;

renderPage({
  eyebrow: 'Fleet operations',
  title: 'Vehicle overview',
  description: 'Monitor vehicle readiness and service priorities from one operational view.',
  content: appContent,
});

const loginForm = document.querySelector('#login-form');
const registerForm = document.querySelector('#register-form');
const loginPanel = document.querySelector('#login-panel');
const registerPanel = document.querySelector('#register-panel');
const loginTab = document.querySelector('#login-tab');
const registerTab = document.querySelector('#register-tab');

document.querySelectorAll('[data-password-toggle]').forEach((toggle) => {
  toggle.addEventListener('click', () => {
    const input = document.querySelector(toggle.dataset.passwordToggle);
    if (!input) return;
    const isVisible = input.type === 'text';
    input.type = isVisible ? 'password' : 'text';
    toggle.setAttribute('aria-pressed', String(!isVisible));
    toggle.setAttribute('aria-label', `${isVisible ? 'Show' : 'Hide'} password`);
    toggle.querySelector('i').className = `bi ${isVisible ? 'bi-eye' : 'bi-eye-slash'}`;
    toggle.querySelector('.visually-hidden').textContent = `${isVisible ? 'Show' : 'Hide'} password`;
  });
});

function showAuthPanel(panel) {
  const isRegister = panel === 'register';
  loginPanel.classList.toggle('d-none', isRegister);
  registerPanel.classList.toggle('d-none', !isRegister);
  loginTab.classList.toggle('btn-primary', !isRegister);
  loginTab.classList.toggle('btn-outline-primary', isRegister);
  registerTab.classList.toggle('btn-primary', isRegister);
  registerTab.classList.toggle('btn-outline-primary', !isRegister);
  loginTab.setAttribute('aria-selected', String(!isRegister));
  registerTab.setAttribute('aria-selected', String(isRegister));
}

function syncAuthHash() {
  showAuthPanel(window.location.hash === '#register' ? 'register' : 'login');
}

window.addEventListener('hashchange', syncAuthHash);
syncAuthHash();

const demoEmails = {
  manager: 'manager.demo@fleetpulse.local',
  accountant: 'accountant.demo@fleetpulse.local',
  warehouse: 'warehouse.demo@fleetpulse.local',
  driver: 'driver.one.demo@fleetpulse.local',
};
document.querySelectorAll('[data-demo-role]').forEach((button) => {
  button.addEventListener('click', () => {
    showAuthPanel('login');
    window.history.replaceState(null, '', '#login');
    document.querySelector('#login-email').value = demoEmails[button.dataset.demoRole];
    const demoPassword = import.meta.env.VITE_DEMO_PASSWORD;
    if (demoPassword) document.querySelector('#login-password').value = demoPassword;
    showToast(
      demoPassword ? 'Demo credentials filled. Select Sign in to continue.' : 'Demo email filled. Set VITE_DEMO_PASSWORD to fill the password automatically.',
      { title: 'Quick Demo Login', variant: 'info' }
    );
  });
});

function validateForm(form) {
  form.classList.add('was-validated');
  return form.checkValidity();
}

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!validateForm(loginForm)) return;
  const submitButton = loginForm.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  try {
    const data = await signIn(
      document.querySelector('#login-email').value.trim(),
      document.querySelector('#login-password').value
    );
    const role = await getUserRole(data.user?.id);
    if (!role) throw new Error('Your account has no assigned FleetPulse role. Contact a Fleet Manager.');
    showToast('Sign-in successful. Redirecting…', { title: 'Welcome', variant: 'success' });
    window.setTimeout(() => window.location.assign(getRoleRedirect(role)), 350);
  } catch (error) {
    showToast(error.message, { title: 'Sign-in failed', variant: 'danger' });
    submitButton.disabled = false;
  }
});

registerForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const password = document.querySelector('#register-password');
  const confirmation = document.querySelector('#register-confirm-password');
  confirmation.setCustomValidity(password.value === confirmation.value ? '' : 'Passwords do not match.');
  if (!validateForm(registerForm)) return;
  const submitButton = registerForm.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  try {
    const data = await signUp(
      document.querySelector('#register-email').value.trim(),
      password.value,
      document.querySelector('#register-name').value.trim()
    );
    showToast(
      data.session ? 'Registration successful. You can now sign in.' : 'Registration successful. Confirm your email before signing in.',
      { title: 'Account created', variant: 'success' }
    );
    registerForm.reset();
    registerForm.classList.remove('was-validated');
  } catch (error) {
    showToast(error.message, { title: 'Registration failed', variant: 'danger' });
  } finally {
    submitButton.disabled = false;
  }
});

const summaryElement = document.querySelector('#fleet-summary');
const listElement = document.querySelector('#vehicle-list');
const searchElement = document.querySelector('#vehicle-search');
const filterElement = document.querySelector('#status-filter');
const driverFilterElement = document.querySelector('#driver-filter');
const sortElement = document.querySelector('#sort-filter');
const updatedElement = document.querySelector('#fleet-updated');
let fleetOverview = { vehicles: [], summary: null };

function summaryCard(label, value, icon, className) {
  return `
    <div class="col-6 col-xl-3">
      <article class="summary-card ${className}">
        <div class="summary-card-icon"><i class="bi ${icon}" aria-hidden="true"></i></div>
        <div><p class="summary-card-label">${label}</p><p class="summary-card-value">${value}</p></div>
      </article>
    </div>
  `;
}

function renderSummary(summary) {
  summaryElement.innerHTML = [
    summaryCard('Total vehicles', summary.total, 'bi-truck', 'summary-neutral'),
    summaryCard('Active', summary.active, 'bi-check-circle-fill', 'summary-active'),
    summaryCard('Scheduled maintenance', summary.maintenance, 'bi-tools', 'summary-maintenance'),
    summaryCard('Urgent repair', summary.outOfService, 'bi-exclamation-octagon-fill', 'summary-out'),
  ].join('');
}

function renderVehicles() {
  if (!fleetOverview.vehicles.length) {
    listElement.innerHTML = emptyState({
      icon: 'bi-truck',
      title: 'No vehicles match these filters',
      message: 'Try a different plate, model, or status.',
    });
    return;
  }

  listElement.innerHTML = `
    <div class="row g-3">
      ${fleetOverview.vehicles.map((vehicle) => `
        <div class="col-md-6 col-xl-4">
          <article class="vehicle-card h-100">
            <div class="d-flex justify-content-between align-items-start gap-2 mb-3">
              <div>
                <p class="vehicle-plate mb-1">${escapeHtml(vehicle.license_plate)}</p>
                <h3 class="h5 mb-0">${escapeHtml(vehicle.brand_model)}</h3>
              </div>
              ${statusBadge(vehicle.status)}
            </div>
            <dl class="vehicle-details mb-0">
              <div><dt>Mileage</dt><dd>${Number(vehicle.mileage).toLocaleString()} km</dd></div>
              <div><dt>Fuel / battery</dt><dd>${vehicle.fuel_battery_level}%</dd></div>
              <div><dt>Assigned driver</dt><dd>${escapeHtml(vehicle.assigned_driver_name || 'Unassigned')}</dd></div>
              <div><dt>Cargo capacity</dt><dd>${vehicle.cargo ? `${Number(vehicle.cargo.max_cargo_kg).toLocaleString()} kg` : 'Not recorded'}</dd></div>
            </dl>
            <div class="vehicle-alerts mt-3">
              <span class="small ${vehicle.recent_inspection?.passes_check ? 'text-success' : 'text-secondary'}">
                <i class="bi ${vehicle.recent_inspection?.passes_check ? 'bi-check-circle' : 'bi-clipboard-x'}" aria-hidden="true"></i>
                ${vehicle.recent_inspection ? (vehicle.recent_inspection.passes_check ? 'Recent inspection passed' : 'Recent inspection failed') : 'No inspection recorded'}
              </span>
              ${vehicle.maintenance_alerts.length ? `<span class="small text-warning-emphasis"><i class="bi bi-tools" aria-hidden="true"></i> ${vehicle.maintenance_alerts.length} maintenance alert${vehicle.maintenance_alerts.length === 1 ? '' : 's'}</span>` : ''}
            </div>
            <div class="vehicle-links mt-3" aria-label="Vehicle workflows">
              <a href="/driver.html?license_plate=${encodeURIComponent(vehicle.license_plate)}">Inspections</a>
              <a href="/report.html?license_plate=${encodeURIComponent(vehicle.license_plate)}">Daily reports</a>
              <a href="/accountant.html?license_plate=${encodeURIComponent(vehicle.license_plate)}">Service history</a>
            </div>
          </article>
        </div>
      `).join('')}
    </div>
  `;
}

let requestSequence = 0;
let searchTimer;

function currentFilters() {
  const [sort = 'updated_at', direction = 'desc'] = sortElement.value.split(':');
  return {
    search: searchElement.value.trim(),
    status: filterElement.value === 'all' ? null : filterElement.value,
    driverName: driverFilterElement.value || null,
    vehicleId: new URLSearchParams(window.location.search).get('vehicle_id'),
    sort,
    direction,
  };
}

async function loadOverview() {
  const sequence = ++requestSequence;
  listElement.innerHTML = loadingSkeleton(3);
  try {
    const overview = await fetchFleetOverview(currentFilters());
    if (sequence !== requestSequence) return;
    fleetOverview = overview;
    renderSummary(overview.summary);
    renderVehicles();
    const activeFilters = Object.values(currentFilters()).some(Boolean);
    updatedElement.textContent = `${activeFilters ? 'Filtered' : 'Complete fleet'} · Updated ${new Intl.DateTimeFormat(undefined, { timeStyle: 'short' }).format(new Date())}`;
  } catch (error) {
    if (sequence !== requestSequence) return;
    listElement.innerHTML = emptyState({ icon: 'bi-database-exclamation', title: 'Fleet data unavailable', message: error.message });
    showToast(error.message, { title: 'Fleet data error', variant: 'danger' });
  }
}

try {
  const params = new URLSearchParams(window.location.search);
  const urlStatus = params.get('status');
  const urlDriver = params.get('driver');
  const urlSearch = params.get('search');
  const urlSort = params.get('sort');
  const urlDirection = params.get('direction');
  if (urlStatus) filterElement.value = urlStatus;
  if (urlSearch) searchElement.value = urlSearch;
  if (urlSort && urlDirection) sortElement.value = `${urlSort}:${urlDirection}`;

  let drivers = [];
  try {
    drivers = await fetchDriverFilterOptions();
  } catch (error) {
    showToast('Assigned-driver filters are unavailable for this role.', { title: 'Limited fleet filters', variant: 'warning' });
  }
  drivers.forEach((driver) => {
    const option = document.createElement('option');
    option.value = driver;
    option.textContent = driver;
    driverFilterElement.append(option);
  });
  if (urlDriver && drivers.includes(urlDriver)) driverFilterElement.value = urlDriver;
  searchElement.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(loadOverview, 250);
  });
  filterElement.addEventListener('change', loadOverview);
  driverFilterElement.addEventListener('change', loadOverview);
  sortElement.addEventListener('change', loadOverview);
  await loadOverview();
} catch (error) {
  summaryElement.innerHTML = emptyState({
    icon: 'bi-database-exclamation',
    title: 'Fleet data unavailable',
    message: 'Sign in with an authorized FleetPulse role to view vehicle operations.',
  });
  listElement.innerHTML = emptyState({ icon: 'bi-database-exclamation', title: 'Fleet data unavailable', message: error.message });
  updatedElement.textContent = 'Live data unavailable';
  showToast(error.message, { title: 'Fleet data error', variant: 'danger' });
}
