const THEME_STORAGE_KEY = 'fleetpulse-theme';
const THEMES = ['light', 'dark'];

function isTheme(value) {
  return THEMES.includes(value);
}

function getStoredTheme() {
  try {
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isTheme(storedTheme) ? storedTheme : null;
  } catch (error) {
    console.warn('Unable to read the saved theme preference.', error);
    return null;
  }
}

function getPreferredTheme() {
  return getStoredTheme() || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
}

export function applyTheme(theme) {
  if (!isTheme(theme)) throw new Error(`Unsupported theme: ${theme}`);

  document.documentElement.dataset.theme = theme;
  document.documentElement.dataset.bsTheme = theme;
}

export function initializeTheme() {
  const theme = getPreferredTheme();
  applyTheme(theme);
  return theme;
}

export function toggleTheme() {
  const nextTheme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  applyTheme(nextTheme);

  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
  } catch (error) {
    console.warn('Unable to save the theme preference.', error);
  }

  return nextTheme;
}
