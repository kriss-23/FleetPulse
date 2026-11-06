const statuses = {
  active: { label: 'Active', className: 'status-active', icon: 'bi-check-circle-fill' },
  maintenance: { label: 'Maintenance', className: 'status-maintenance', icon: 'bi-tools' },
  outOfService: { label: 'Out of Service', className: 'status-out', icon: 'bi-exclamation-octagon-fill' },
};

export function statusBadge(status = 'active') {
  const item = statuses[status] || statuses.active;
  return `<span class="status-badge ${item.className}"><i class="bi ${item.icon}" aria-hidden="true"></i>${item.label}</span>`;
}
