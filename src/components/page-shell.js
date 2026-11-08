import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import '../styles/main.css';
import { initializeNavbar, renderNavbar } from './navbar.js';
import { renderFooter } from './footer.js';
import { mountConfirmDialog } from './confirm-dialog.js';
import { mountToastContainer } from './feedback.js';
import { initializeTheme, toggleTheme } from './theme.js';
import { mountConsentBanner } from './consent-banner.js';

export function renderPage({ title, description, eyebrow, content, user = null, role = null }) {
  const app = document.querySelector('#app');
  if (!app) throw new Error('Page mount element #app was not found.');

  initializeTheme();
  app.innerHTML = `
    <div class="app-shell">
      ${renderNavbar({ user, role })}
      <main class="page-container">
        <a class="skip-link" href="#page-bottom">Skip to page bottom</a>
        <div class="container py-4 py-lg-5">
          <p class="eyebrow">${eyebrow}</p>
          <h1 class="page-title">${title}</h1>
          <p class="page-intro">${description}</p>
          ${content}
        </div>
      </main>
      ${renderFooter()}
      <a class="page-bottom-button btn btn-primary" href="#page-bottom" aria-label="Go to page bottom">
        <i class="bi bi-arrow-down" aria-hidden="true"></i>
      </a>
    </div>
  `;
  const themeToggle = app.querySelector('[data-action="toggle-theme"]');
  const setupThemeToggle = () => {
    const currentToggle = app.querySelector('[data-action="toggle-theme"]');
    const themeLabel = currentToggle?.querySelector('[data-theme-label]');
    const themeIcon = currentToggle?.querySelector('i');
    if (!currentToggle || !themeLabel || !themeIcon || currentToggle.dataset.bound === 'true') return;
    const updateThemeToggle = (theme) => {
      const isDark = theme === 'dark';
      currentToggle.setAttribute('aria-pressed', String(isDark));
      currentToggle.setAttribute('aria-label', `Switch to ${isDark ? 'light' : 'dark'} mode`);
      themeLabel.textContent = `${isDark ? 'Light' : 'Dark'} mode`;
      themeIcon.className = `bi ${isDark ? 'bi-sun' : 'bi-moon-stars'}`;
    };
    currentToggle.dataset.bound = 'true';
    updateThemeToggle(document.documentElement.dataset.theme);
    currentToggle.addEventListener('click', () => updateThemeToggle(toggleTheme()));
  };
  setupThemeToggle();
  mountConfirmDialog();
  mountToastContainer();
  mountConsentBanner();
  initializeNavbar().then(setupThemeToggle);
}

export function selectedQueryValue(key) {
  return new URLSearchParams(window.location.search).get(key);
}
