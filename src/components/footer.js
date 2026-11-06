export function renderFooter() {
  return `
    <footer class="site-footer mt-auto">
      <div class="container d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
        <span>FleetPulse <span class="text-muted">v0.1.0</span></span>
        <div class="d-flex gap-3">
          <a href="/index.html#status">System status</a>
          <a href="/index.html#privacy">Privacy</a>
        </div>
      </div>
    </footer>
  `;
}
