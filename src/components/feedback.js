export function loadingSkeleton(rows = 3) {
  return `<div class="skeleton-list" aria-label="Loading content" aria-busy="true">${Array.from({ length: rows }, () => '<div class="skeleton-line"></div>').join('')}</div>`;
}

export function emptyState({ icon = 'bi-inbox', title = 'Nothing here yet', message = 'Live data will appear here when it is available.' } = {}) {
  return `
    <div class="empty-state text-center" role="status">
      <i class="bi ${icon} empty-state-icon" aria-hidden="true"></i>
      <h3 class="h5">${title}</h3>
      <p class="text-secondary mb-0">${message}</p>
    </div>
  `;
}

export function mountToastContainer() {
  let container = document.querySelector('#toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container position-fixed top-0 end-0 p-3';
    container.setAttribute('aria-live', 'polite');
    container.setAttribute('aria-atomic', 'true');
    document.body.append(container);
  }
  return container;
}

export function showToast(message, { title = 'FleetPulse', variant = 'primary' } = {}) {
  const container = mountToastContainer();
  const toast = document.createElement('div');
  toast.className = 'toast align-items-center border-0';
  toast.setAttribute('role', 'alert');
  toast.innerHTML = `<div class="toast-header"><span class="toast-indicator bg-${variant} me-2"></span><strong class="me-auto">${title}</strong><button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button></div><div class="toast-body">${message}</div>`;
  container.append(toast);
  const instance = window.bootstrap?.Toast.getOrCreateInstance(toast, { delay: 5000 });
  instance?.show();
}
