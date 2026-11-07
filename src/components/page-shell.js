import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import '../styles/main.css';
import { renderNavbar } from './navbar.js';
import { renderFooter } from './footer.js';
import { mountConfirmDialog } from './confirm-dialog.js';
import { mountToastContainer } from './feedback.js';
import { initializeTheme, toggleTheme } from './theme.js';

export function renderPage({ title, description, eyebrow, content, user = null, role = null }) {
  const app = document.querySelector('#app');
  if (!app) throw new Error('Page mount element #app was not found.');

  initializeTheme();
  app.innerHTML = `
    <div class="app-shell">
      ${renderNavbar({ user, role })}
      <main class="page-container">
        <div class="container py-4 py-lg-5">
          <p class="eyebrow">${eyebrow}</p>
          <h1 class="page-title">${title}</h1>
          <p class="page-intro">${description}</p>
          ${content}
        </div>
      </main>
      ${renderFooter()}
    </div>
  `;
  const themeToggle = app.querySelector('[data-action="toggle-theme"]');
  const themeLabel = themeToggle?.querySelector('[data-theme-label]');
  const themeIcon = themeToggle?.querySelector('i');
  if (themeToggle && themeLabel && themeIcon) {
    const updateThemeToggle = (theme) => {
      const isDark = theme === 'dark';
      themeToggle.setAttribute('aria-pressed', String(isDark));
      themeToggle.setAttribute('aria-label', `Switch to ${isDark ? 'light' : 'dark'} mode`);
      themeLabel.textContent = `${isDark ? 'Light' : 'Dark'} mode`;
      themeIcon.className = `bi ${isDark ? 'bi-sun' : 'bi-moon-stars'}`;
    };

    updateThemeToggle(document.documentElement.dataset.theme);
    themeToggle.addEventListener('click', () => updateThemeToggle(toggleTheme()));
  }
  mountConfirmDialog();
  mountToastContainer();
}

export function selectedQueryValue(key) {
  return new URLSearchParams(window.location.search).get(key);
}
