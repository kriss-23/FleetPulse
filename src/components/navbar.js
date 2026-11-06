import { escapeHtml } from '../utils/escape-html.js';

const publicLinks = [
  ['Home / Login', '/index.html', 'bi-house-door'],
  ['Register', '/index.html#register', 'bi-person-plus'],
];

const authenticatedLinks = [
  ['Driver View', '/driver.html', 'bi-speedometer2'],
  ['Daily Report', '/report.html', 'bi-clipboard2-check'],
];

export function renderNavbar({ user = null, role = null } = {}) {
  const links = user ? [...authenticatedLinks] : publicLinks;
  if (role === 'Fleet Manager') links.push(['Fleet Manager Panel', '/admin.html', 'bi-truck']);
  if (role === 'Accountant') links.push(['Accountant Portal', '/accountant.html', 'bi-receipt']);

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
            <div class="d-flex align-items-center gap-3">${identity}<ul class="navbar-nav">${accountLinks}</ul></div>
          </div>
        </div>
      </nav>
    </header>
  `;
}
