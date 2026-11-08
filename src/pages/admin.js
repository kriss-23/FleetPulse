import { Modal } from 'bootstrap';
import { renderPage } from '../components/page-shell.js';
import { emptyState, loadingSkeleton, showToast } from '../components/feedback.js';
import { statusBadge } from '../components/status.js';
import { escapeHtml } from '../utils/escape-html.js';
import { assignVehicle, fetchAdminData, updateMaintenance, updateVehicleStatus } from '../services/admin-service.js';
import { vehicleImage } from '../utils/vehicle-media.js';

renderPage({
  eyebrow: 'Fleet management',
  title: 'Manager Admin Panel',
  description: 'Control fleet readiness, driver assignments, and maintenance approvals.',
  content: `<section id="admin-content" aria-live="polite">${loadingSkeleton(6)}</section>`,
});

const content = document.querySelector('#admin-content');
let state = { vehicles: [], drivers: [], maintenance: [] };
let activeVehicle = null;
let activeMaintenance = null;
let vehicleSort = { key: 'license_plate', direction: 'asc' };

const vehicleSortLabels = {
  license_plate: 'Vehicle',
  status: 'Status',
  assigned_driver: 'Assigned driver',
  mileage: 'Mileage',
};

function sortedVehicles() {
  return [...state.vehicles].sort((left, right) => {
    const leftValue = left[vehicleSort.key] ?? (vehicleSort.key === 'assigned_driver' ? left.assigned_driver?.full_name : '');
    const rightValue = right[vehicleSort.key] ?? (vehicleSort.key === 'assigned_driver' ? right.assigned_driver?.full_name : '');
    const comparison = typeof leftValue === 'number' && typeof rightValue === 'number'
      ? leftValue - rightValue
      : String(leftValue).localeCompare(String(rightValue), undefined, { sensitivity: 'base', numeric: true });
    return vehicleSort.direction === 'asc' ? comparison : -comparison;
  });
}

function sortButton(key) {
  const active = vehicleSort.key === key;
  const nextDirection = active && vehicleSort.direction === 'asc' ? 'desc' : 'asc';
  const icon = active ? (vehicleSort.direction === 'asc' ? 'bi-sort-up' : 'bi-sort-down') : 'bi-arrow-down-up';
  return `<button class="btn btn-link table-sort-button p-0 text-reset fw-bold" type="button" data-sort="${key}" aria-label="Sort ${vehicleSortLabels[key]} ${nextDirection === 'asc' ? 'ascending' : 'descending'}">${vehicleSortLabels[key]} <i class="bi ${icon}" aria-hidden="true"></i></button>`;
}

function inspectionSummary(vehicle) {
  const inspection = vehicle.inspections?.[0];
  if (!inspection) return '<span class="text-secondary">No inspection recorded</span>';
  const result = inspection.passes_check ? 'Passed' : 'Failed';
  const style = inspection.passes_check ? 'text-success' : 'text-danger';
  return `<span class="${style}">${result}</span><br><span class="small text-secondary">${escapeHtml(inspection.inspection_date || 'Date unavailable')}</span>`;
}

function formatAssignmentDate(date) {
  const pad = (part) => String(part).padStart(2, '0');
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()}`;
}

function formatAssignmentDateTime(date) {
  const pad = (part) => String(part).padStart(2, '0');
  return `${formatAssignmentDate(date)}, ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function parseAssignmentDate(value) {
  const match = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(value.trim());
  if (!match) return null;
  const [, day, month, year] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  if (date.getFullYear() !== Number(year) || date.getMonth() !== Number(month) - 1 || date.getDate() !== Number(day)) return null;
  return `${year}-${month}-${day}`;
}

function parseAssignmentDateTime(value) {
  const match = /^(\d{2})\.(\d{2})\.(\d{4}),\s(\d{2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const [, day, month, year, hours, minutes] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day), Number(hours), Number(minutes));
  if (date.getFullYear() !== Number(year) || date.getMonth() !== Number(month) - 1 || date.getDate() !== Number(day) || date.getHours() !== Number(hours) || date.getMinutes() !== Number(minutes)) return null;
  return date.toISOString();
}

function formatRequestDate(value) {
  if (!value) return 'Date unavailable';
  const date = new Date(value);
  const pad = (part) => String(part).padStart(2, '0');
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()}, ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function renderPanel() {
  if (!state.vehicles.length) {
    content.innerHTML = emptyState({ icon: 'bi-truck', title: 'No vehicles found', message: 'Fleet vehicles will appear here when they are available.' });
    return;
  }
  const pendingRequests = state.maintenance.filter((item) => item.status === 'pending').length;
  const approvedRequests = state.maintenance.filter((item) => item.status === 'approved').length;
  const mobileVehicleCards = sortedVehicles().map((vehicle) => `<article class="data-card"><div class="data-card-heading">${vehicleImage(vehicle, 'admin-vehicle-photo')}<div><strong>${escapeHtml(vehicle.license_plate)}</strong><span>${escapeHtml(vehicle.brand_model)}</span></div></div><div><span class="data-card-label">Status</span>${statusBadge(vehicle.status)}</div><div><span class="data-card-label">Assigned driver</span><strong>${escapeHtml(vehicle.assigned_driver?.full_name || 'Unassigned')}</strong></div><div><span class="data-card-label">Latest inspection</span>${inspectionSummary(vehicle)}</div><div><span class="data-card-label">Mileage</span><strong>${Number(vehicle.mileage).toLocaleString()} km</strong></div><div class="btn-group btn-group-sm"><button class="btn btn-outline-primary" type="button" data-action="assign" data-id="${vehicle.id}">${vehicle.assigned_driver_id ? 'Reassign' : 'Assign'}</button><button class="btn btn-outline-secondary" type="button" data-action="status" data-id="${vehicle.id}">Status</button></div></article>`).join('');
  content.innerHTML = `
    <div class="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
      <div><span class="badge text-bg-light">${state.vehicles.length} vehicles</span><span class="badge text-bg-warning ms-2">${state.maintenance.length} open maintenance requests</span><span class="badge text-bg-light ms-2">${pendingRequests} pending · ${approvedRequests} approved</span></div>
      <button class="btn btn-outline-primary" type="button" id="refresh-admin"><i class="bi bi-arrow-clockwise me-1" aria-hidden="true"></i>Refresh data</button>
    </div>
    <section aria-labelledby="maintenance-heading" class="mb-4">
      <h2 class="h4" id="maintenance-heading">Maintenance requests</h2>
      ${state.maintenance.length ? `<div class="row g-3">${state.maintenance.map((item) => `
        <div class="col-md-6 col-xl-4"><article class="vehicle-card h-100">
          <div class="d-flex justify-content-between gap-2"><h3 class="h5">${escapeHtml(item.vehicle?.license_plate || 'Vehicle')}</h3><span class="badge text-bg-${item.status === 'approved' ? 'success' : 'warning'}">${escapeHtml(item.status)}</span></div>
          <p class="text-secondary mb-2">${escapeHtml(item.vehicle?.brand_model || '')}</p>
          <p class="small text-secondary mb-2">Created ${escapeHtml(formatRequestDate(item.created_at))}</p>
          <p class="mb-3">Service cost: <strong>${Number(item.service_cost || 0).toFixed(2)} €</strong></p>
          <button class="btn btn-sm btn-outline-primary" type="button" data-action="maintenance" data-id="${item.id}">Review request</button>
        </article></div>`).join('')}</div>` : emptyState({ icon: 'bi-wrench-adjustable-circle', title: 'No open maintenance requests', message: 'Pending and approved requests will appear here.' })}
    </section>
    <div class="placeholder-card p-0 overflow-hidden mb-4 desktop-table">
      <div class="table-responsive">
        <table class="table align-middle mb-0">
          <caption class="visually-hidden">Fleet vehicles and manager actions</caption>
          <thead><tr><th scope="col" aria-sort="${vehicleSort.key === 'license_plate' ? vehicleSort.direction : 'none'}">${sortButton('license_plate')}</th><th scope="col" aria-sort="${vehicleSort.key === 'status' ? vehicleSort.direction : 'none'}">${sortButton('status')}</th><th scope="col" aria-sort="${vehicleSort.key === 'assigned_driver' ? vehicleSort.direction : 'none'}">${sortButton('assigned_driver')}</th><th scope="col">Latest inspection</th><th scope="col" aria-sort="${vehicleSort.key === 'mileage' ? vehicleSort.direction : 'none'}">${sortButton('mileage')}</th><th scope="col" class="text-end">Actions</th></tr></thead>
          <tbody>${sortedVehicles().map((vehicle) => `
            <tr>
              <th scope="row"><div class="admin-vehicle-cell">${vehicleImage(vehicle, 'admin-vehicle-photo')}<span class="vehicle-plate">${escapeHtml(vehicle.license_plate)}</span><br><span class="text-secondary fw-normal">${escapeHtml(vehicle.brand_model)}</span></div></th>
              <td>${statusBadge(vehicle.status)}</td>
              <td>${escapeHtml(vehicle.assigned_driver?.full_name || 'Unassigned')}</td>
              <td>${inspectionSummary(vehicle)}</td>
              <td>${Number(vehicle.mileage).toLocaleString()} km</td>
              <td class="text-end"><div class="btn-group btn-group-sm" role="group" aria-label="Actions for ${escapeHtml(vehicle.license_plate)}">
                <button class="btn btn-outline-primary" type="button" data-action="assign" data-id="${vehicle.id}"><i class="bi bi-person-plus me-1" aria-hidden="true"></i>${vehicle.assigned_driver_id ? 'Reassign' : 'Assign'}</button>
                <button class="btn btn-outline-secondary" type="button" data-action="status" data-id="${vehicle.id}">Status</button>
              </div></td>
            </tr>`).join('')}</tbody>
        </table>
      </div>
      <div class="mobile-card-list mb-4">${mobileVehicleCards}</div>
    </div>
    <div id="admin-modals"></div>
  `;
  document.querySelector('#refresh-admin').addEventListener('click', load);
  content.querySelectorAll('[data-sort]').forEach((button) => button.addEventListener('click', () => {
    const key = button.dataset.sort;
    vehicleSort = vehicleSort.key === key
      ? { key, direction: vehicleSort.direction === 'asc' ? 'desc' : 'asc' }
      : { key, direction: 'asc' };
    renderPanel();
  }));
  content.querySelectorAll('[data-action="assign"]').forEach((button) => button.addEventListener('click', () => openAssign(button.dataset.id)));
  content.querySelectorAll('[data-action="status"]').forEach((button) => button.addEventListener('click', () => openStatus(button.dataset.id)));
  content.querySelectorAll('[data-action="maintenance"]').forEach((button) => button.addEventListener('click', () => openMaintenance(button.dataset.id)));
}

function modal(id, title, body, submitLabel = 'Save changes') {
  const language = id === 'assign-modal' ? ' lang="de-DE"' : '';
  document.querySelector('#admin-modals').innerHTML = `<div class="modal fade" id="${id}"${language} tabindex="-1" aria-labelledby="${id}-title" aria-hidden="true"><div class="modal-dialog modal-dialog-centered"><div class="modal-content"><form id="${id}-form"><div class="modal-header"><h2 class="modal-title h5" id="${id}-title">${title}</h2><button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button></div><div class="modal-body">${body}</div><div class="modal-footer"><button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancel</button><button class="btn btn-primary" type="submit">${submitLabel}</button></div></form></div></div></div>`;
  const element = document.querySelector(`#${id}`);
  const instance = Modal.getOrCreateInstance(element);
  instance.show();
  return { element, instance };
}

function openAssign(vehicleId) {
  activeVehicle = state.vehicles.find((vehicle) => vehicle.id === vehicleId);
  const now = new Date();
  const end = new Date(now);
  end.setHours(end.getHours() + 8);
  const { element, instance } = modal('assign-modal', `${activeVehicle.assigned_driver_id ? 'Reassign' : 'Assign'} driver`, `
    <p class="text-secondary">${escapeHtml(activeVehicle.license_plate)} · ${escapeHtml(activeVehicle.brand_model)}</p>
    <label class="form-label" for="assign-driver">Driver</label>
    <select class="form-select mb-3" id="assign-driver" required><option value="">Select a driver</option>${state.drivers.map((driver) => `<option value="${driver.id}" ${driver.id === activeVehicle.assigned_driver_id ? 'selected' : ''}>${escapeHtml(driver.full_name || 'Unnamed driver')}</option>`).join('')}</select>
    <label class="form-label" for="assign-date">Shift date</label><input class="form-control mb-3" id="assign-date" type="text" inputmode="numeric" autocomplete="off" placeholder="DD.MM.YYYY" pattern="\\d{2}\\.\\d{2}\\.\\d{4}" value="${formatAssignmentDate(now)}" required>
    <div class="row g-3"><div class="col-6"><label class="form-label" for="assign-start">Starts</label><input class="form-control" id="assign-start" type="text" inputmode="numeric" autocomplete="off" placeholder="DD.MM.YYYY, HH:mm" pattern="\\d{2}\\.\\d{2}\\.\\d{4},\\s\\d{2}:\\d{2}" value="${formatAssignmentDateTime(now)}" required></div><div class="col-6"><label class="form-label" for="assign-end">Ends</label><input class="form-control" id="assign-end" type="text" inputmode="numeric" autocomplete="off" placeholder="DD.MM.YYYY, HH:mm" pattern="\\d{2}\\.\\d{2}\\.\\d{4},\\s\\d{2}:\\d{2}" value="${formatAssignmentDateTime(end)}" required></div></div>
  `, activeVehicle.assigned_driver_id ? 'Reassign driver' : 'Assign driver');
  element.querySelector('form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = event.currentTarget.querySelector('button[type="submit"]');
    button.disabled = true;
    try {
      const shiftDate = parseAssignmentDate(element.querySelector('#assign-date').value);
      const shiftStartedAt = parseAssignmentDateTime(element.querySelector('#assign-start').value);
      const shiftEndedAt = parseAssignmentDateTime(element.querySelector('#assign-end').value);
      if (!shiftDate || !shiftStartedAt || !shiftEndedAt) throw new Error('Use DD.MM.YYYY for the date and DD.MM.YYYY, HH:mm for the start and end times.');
      await assignVehicle({ vehicleId, driverId: element.querySelector('#assign-driver').value, shiftDate, shiftStartedAt, shiftEndedAt, reassign: Boolean(activeVehicle.assigned_driver_id) });
      instance.hide(); showToast('Driver assignment saved.', { title: 'Assignment updated', variant: 'success' }); await load();
    } catch (error) { showToast(error.message, { title: 'Assignment failed', variant: 'danger' }); } finally { button.disabled = false; }
  });
}

function openStatus(vehicleId) {
  const vehicle = state.vehicles.find((item) => item.id === vehicleId);
  const { element, instance } = modal('status-modal', 'Update vehicle status', `<p class="text-secondary">${escapeHtml(vehicle.license_plate)} · ${escapeHtml(vehicle.brand_model)}</p><label class="form-label" for="vehicle-status">Traffic-light status</label><select class="form-select" id="vehicle-status" required><option value="active" ${vehicle.status === 'active' ? 'selected' : ''}>🟢 Active / Ready</option><option value="maintenance" ${vehicle.status === 'maintenance' ? 'selected' : ''}>🟡 Scheduled Maintenance</option><option value="out_of_service" ${vehicle.status === 'out_of_service' ? 'selected' : ''}>🔴 Urgent Repair / Out of Service</option></select>`);
  element.querySelector('form').addEventListener('submit', async (event) => { event.preventDefault(); const button = event.currentTarget.querySelector('button[type="submit"]'); button.disabled = true; try { await updateVehicleStatus(vehicleId, element.querySelector('#vehicle-status').value); instance.hide(); showToast('Vehicle status updated.', { title: 'Status saved', variant: 'success' }); await load(); } catch (error) { showToast(error.message, { title: 'Status update failed', variant: 'danger' }); } finally { button.disabled = false; } });
}

function openMaintenance(maintenanceId) {
  activeMaintenance = state.maintenance.find((item) => item.id === maintenanceId);
  const { element, instance } = modal('maintenance-modal', 'Review maintenance request', `<p class="text-secondary">${escapeHtml(activeMaintenance.vehicle?.license_plate || '')} · ${escapeHtml(activeMaintenance.vehicle?.brand_model || '')}</p><label class="form-label" for="maintenance-status">Decision</label><select class="form-select mb-3" id="maintenance-status" required><option value="approved">Approve for service</option><option value="completed">Mark completed</option></select><label class="form-label" for="maintenance-cost">Total service cost (€)</label><input class="form-control" id="maintenance-cost" type="number" min="0" step="0.01" value="${Number(activeMaintenance.service_cost || 0)}" required>`);
  element.querySelector('form').addEventListener('submit', async (event) => { event.preventDefault(); const button = event.currentTarget.querySelector('button[type="submit"]'); button.disabled = true; try { await updateMaintenance({ maintenanceId, status: element.querySelector('#maintenance-status').value, serviceCost: Number(element.querySelector('#maintenance-cost').value) }); instance.hide(); showToast('Maintenance request updated.', { title: 'Maintenance saved', variant: 'success' }); await load(); } catch (error) { showToast(error.message, { title: 'Maintenance update failed', variant: 'danger' }); } finally { button.disabled = false; } });
}

async function load() {
  content.innerHTML = loadingSkeleton(6);
  try { state = await fetchAdminData(); renderPanel(); } catch (error) { content.innerHTML = emptyState({ icon: 'bi-shield-lock', title: 'Manager access required', message: error.message }); showToast(error.message, { title: 'Admin panel unavailable', variant: 'danger' }); }
}

load();
