import { escapeHtml } from '../utils/escape-html.js';
import { getAuthenticatedContext, signOut } from '../services/auth.js';
import { showToast } from './feedback.js';

const publicLinks = [
  ['Home / Login', '/index.html', 'bi-house-door'],
  ['Register', '/index.html#register', 'bi-person-plus'],
];

const authenticatedLinks = [
  ['Driver View', '/driver.html', 'bi-speedometer2'],
  ['Daily Report', '/report.html', 'bi-clipboard2-check'],
];

function roleLabel(role) {
  return {
    manager: 'Fleet Manager',
    accountant: 'Accountant',
    warehouse: 'Warehouse Specialist',
    driver: 'Driver',
  }[role] || 'Authenticated user';
}

function buildLinks(user, role) {
  if (!user) return publicLinks;
  const links = [...authenticatedLinks];
  if (role === 'manager') links.push(['Fleet Manager Panel', '/admin.html', 'bi-truck']);
  if (role === 'accountant') links.push(['Accountant Portal', '/accountant.html', 'bi-receipt']);
  return links;
}

export function renderNavbar({ user = null, role = null } = {}) {
  const links = buildLinks(user, role);
  const navLinks = links.map(([label, href, icon]) => `
    <li class="nav-item">
      <a class="nav-link" href="${href}"><i class="bi ${icon}" aria-hidden="true"></i><span>${label}</span></a>
    </li>
  `).join('');
  const accountLinks = user ? `
    <li class="nav-item dropdown">
      <button class="nav-link dropdown-toggle btn btn-link" data-bs-toggle="dropdown" aria-expanded="false">
        <i class="bi bi-person-circle" aria-hidden="true"></i><span>Account</span>
      </button>
      <ul class="dropdown-menu dropdown-menu-end">
        <li><span class="dropdown-item-text small">${escapeHtml(roleLabel(role))}</span></li>
        <li><hr class="dropdown-divider"></li>
        <li><a class="dropdown-item" href="/index.html#profile"><i class="bi bi-person me-2" aria-hidden="true"></i>Account Profile</a></li>
        <li><button class="dropdown-item" type="button" data-action="logout"><i class="bi bi-box-arrow-right me-2" aria-hidden="true"></i>Log out</button></li>
      </ul>
    </li>
  ` : '';
  const identity = user ? `<span class="navbar-text small">${escapeHtml(user.email || 'Signed in')}</span>` : '';

  return `
    <header class="site-header">
      <nav class="navbar navbar-expand-lg" aria-label="Primary navigation">
        <div class="container">
          <a class="navbar-brand" href="/index.html"><span class="brand-mark"><i class="bi bi-signpost-2" aria-hidden="true"></i></span>FleetPulse</a>
          <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#primary-navigation" aria-controls="primary-navigation" aria-expanded="false" aria-label="Toggle navigation">
            <span class="navbar-toggler-icon"></span>
          </button>
          <div class="collapse navbar-collapse" id="primary-navigation">
            <ul class="navbar-nav me-auto mb-2 mb-lg-0">${navLinks}</ul>
            <div class="d-flex align-items-center gap-3">
              <button class="theme-toggle btn btn-sm" type="button" data-action="toggle-theme" aria-pressed="false">
                <i class="bi bi-moon-stars" aria-hidden="true"></i><span data-theme-label>Dark mode</span>
              </button>
              ${identity}<ul class="navbar-nav">${accountLinks}</ul>
            </div>
          </div>
        </div>
      </nav>
    </header>
  `;
}

export async function initializeNavbar() {
  const header = document.querySelector('.site-header');
  if (!header) return;
  try {
    const context = await getAuthenticatedContext();
    header.outerHTML = renderNavbar(context);
    const logoutButton = document.querySelector('[data-action="logout"]');
    logoutButton?.addEventListener('click', async () => {
      try {
        await signOut();
        window.location.assign('/index.html');
      } catch (error) {
        showToast(error.message, { title: 'Logout failed', variant: 'danger' });
      }
    });
  } catch (error) {
    showToast(error.message, { title: 'Session unavailable', variant: 'warning' });
  }
}
