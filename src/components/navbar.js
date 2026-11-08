import { Dropdown, Modal } from 'bootstrap';
import { escapeHtml } from '../utils/escape-html.js';
import { deleteCurrentAccount, getAuthenticatedContext, signOut, updatePassword } from '../services/auth.js';
import { showToast } from './feedback.js';
import { confirmAction } from './confirm-dialog.js';

const publicLinks = [
  ['Home / Login', '/index.html', 'bi-house-door'],
  ['Register', '/index.html#register', 'bi-person-plus'],
  ['FAQ', '/faq.html', 'bi-question-circle'],
  ['Legal Notice', '/legal_notice.html', 'bi-file-earmark-text'],
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
  const links = authenticatedLinks.filter(([label]) => label !== 'Driver View' || role === 'driver');
  if (role === 'manager') links.push(['Fleet Manager Panel', '/admin.html', 'bi-truck']);
  if (role === 'accountant') links.push(['Accountant Portal', '/accountant.html', 'bi-receipt']);
  return links;
}

export function renderNavbar({ user = null, role = null, profile = null } = {}) {
  const links = buildLinks(user, role);
  const navLinks = links.map(([label, href, icon]) => `
    <li class="nav-item">
      <a class="nav-link" href="${href}"><i class="bi ${icon}" aria-hidden="true"></i><span>${label}</span></a>
    </li>
  `).join('');
  const accountLinks = user ? `
    <li class="nav-item dropdown">
      <button class="nav-link dropdown-toggle btn btn-link" type="button" data-bs-toggle="dropdown" aria-expanded="false">
        <i class="bi bi-person-circle" aria-hidden="true"></i><span>Account</span>
      </button>
      <ul class="dropdown-menu dropdown-menu-end">
        <li><span class="dropdown-item-text small">${escapeHtml(roleLabel(role))}</span></li>
        <li><hr class="dropdown-divider"></li>
        <li><button class="dropdown-item" type="button" data-action="view-account"><i class="bi bi-person-vcard me-2" aria-hidden="true"></i>View account</button></li>
        <li><button class="dropdown-item" type="button" data-action="change-password"><i class="bi bi-key me-2" aria-hidden="true"></i>Change password</button></li>
        <li><button class="dropdown-item text-danger" type="button" data-action="delete-account"><i class="bi bi-person-x me-2" aria-hidden="true"></i>Delete account</button></li>
        <li><button class="dropdown-item" type="button" data-action="logout"><i class="bi bi-box-arrow-right me-2" aria-hidden="true"></i>Log out</button></li>
      </ul>
    </li>
  ` : '';
  const displayName = profile?.full_name || user?.user_metadata?.full_name || user?.email || 'Signed in';
  const identity = user ? `<span class="navbar-text small" title="${escapeHtml(user.email || '')}">${escapeHtml(displayName)}</span>` : '';

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
              ${identity}<span id="account-action-feedback" class="small text-success d-none" role="status" aria-live="polite"></span><ul class="navbar-nav">${accountLinks}</ul>
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
    initializeAccountDropdown();
    document.querySelector('[data-action="view-account"]')?.addEventListener('click', () => {
      showAccountModal(context);
    });
    const logoutButton = document.querySelector('[data-action="logout"]');
    logoutButton?.addEventListener('click', async () => {
      try {
        await signOut();
        window.location.assign('/index.html');
      } catch (error) {
        showToast(error.message, { title: 'Logout failed', variant: 'danger' });
      }
    });
    document.querySelector('[data-action="change-password"]')?.addEventListener('click', () => {
      const password = window.prompt('Enter a new password (at least 8 characters):');
      if (!password) return;
      if (password.length < 8) {
        showAccountFeedback('Password was not changed. Use at least 8 characters.', 'danger');
        showToast('Use at least 8 characters for your new password.', { title: 'Password not changed', variant: 'warning' });
        return;
      }
      updatePassword(password)
        .then(() => {
          showAccountFeedback('Password changed successfully.', 'success');
          showToast('Your password was changed successfully.', { title: 'Password updated', variant: 'success' });
        })
        .catch((error) => {
          showAccountFeedback(error.message, 'danger');
          showToast(error.message, { title: 'Password change failed', variant: 'danger' });
        });
    });
    document.querySelector('[data-action="delete-account"]')?.addEventListener('click', () => {
      confirmAction({
        title: 'Delete FleetPulse account?',
        message: 'This permanently deletes your account. Historical operational records are retained without your personal profile. Continue?',
        onConfirm: async () => {
          try {
            await deleteCurrentAccount();
            window.location.replace('/index.html?account_deleted=1');
          } catch (error) {
            showToast(error.message, { title: 'Account deletion failed', variant: 'danger' });
          }
        },
      });
    });
  } catch (error) {
    showToast(error.message, { title: 'Session unavailable', variant: 'warning' });
  }
}

function initializeAccountDropdown() {
  const toggle = document.querySelector('[data-bs-toggle="dropdown"]');
  const menu = toggle?.closest('.dropdown')?.querySelector('.dropdown-menu');
  if (!toggle || !menu) return;
  const dropdown = Dropdown.getOrCreateInstance(toggle);
  toggle.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    dropdown.toggle();
  });
  menu.addEventListener('click', (event) => event.stopPropagation());
  document.addEventListener('click', () => dropdown.hide(), { once: false });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') dropdown.hide();
  });
}

function showAccountModal({ user, role, profile }) {
  const modalId = 'account-details-modal';
  document.querySelector(`#${modalId}`)?.remove();
  document.body.insertAdjacentHTML('beforeend', `
    <div class="modal fade" id="${modalId}" tabindex="-1" aria-labelledby="${modalId}-title" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h2 class="modal-title h5" id="${modalId}-title">Your FleetPulse account</h2>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <dl class="row mb-0">
              <dt class="col-sm-4">Name</dt><dd class="col-sm-8">${escapeHtml(profile?.full_name || user?.user_metadata?.full_name || 'Not provided')}</dd>
              <dt class="col-sm-4">Email</dt><dd class="col-sm-8">${escapeHtml(user?.email || 'Not provided')}</dd>
              <dt class="col-sm-4">Role</dt><dd class="col-sm-8">${escapeHtml(roleLabel(role))}</dd>
            </dl>
          </div>
        </div>
      </div>
    </div>
  `);
  Modal.getOrCreateInstance(document.querySelector(`#${modalId}`)).show();
}

function showAccountFeedback(message, variant) {
  const feedback = document.querySelector('#account-action-feedback');
  if (!feedback) return;
  feedback.textContent = message;
  feedback.className = `small text-${variant}`;
}
