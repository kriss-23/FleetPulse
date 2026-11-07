const CONSENT_KEY = 'fleetpulse-analytics-consent';
let clarityLoaded = false;

function loadClarity() {
  const projectId = import.meta.env.VITE_CLARITY_PROJECT_ID;
  if (clarityLoaded || !projectId) return;
  clarityLoaded = true;
  window.clarity = window.clarity || function clarityProxy(...args) {
    (window.clarity.q = window.clarity.q || []).push(args);
  };
  window.clarity('consent');
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.clarity.ms/tag/${encodeURIComponent(projectId)}`;
  document.head.append(script);
}

export function mountConsentBanner() {
  if (localStorage.getItem(CONSENT_KEY) || document.querySelector('#consent-banner')) return;
  const banner = document.createElement('aside');
  banner.id = 'consent-banner';
  banner.className = 'consent-banner';
  banner.setAttribute('role', 'dialog');
  banner.setAttribute('aria-labelledby', 'consent-title');
  banner.innerHTML = `
    <div>
      <h2 id="consent-title" class="h6 mb-1">Privacy choices</h2>
      <p class="small mb-0">FleetPulse uses necessary storage for sign-in. Optional Microsoft Clarity analytics may be enabled to understand anonymous usability patterns. It is off unless you accept.</p>
    </div>
    <div class="d-flex flex-wrap gap-2">
      <button class="btn btn-sm btn-outline-secondary" type="button" data-consent="reject">Only necessary</button>
      <button class="btn btn-sm btn-primary" type="button" data-consent="accept">Allow analytics</button>
    </div>
  `;
  document.body.append(banner);
  banner.querySelectorAll('[data-consent]').forEach((button) => {
    button.addEventListener('click', () => {
      localStorage.setItem(CONSENT_KEY, button.dataset.consent);
      if (button.dataset.consent === 'accept') loadClarity();
      banner.remove();
    });
  });
}
