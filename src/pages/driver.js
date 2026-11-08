import { renderPage } from '../components/page-shell.js';
import { emptyState, loadingSkeleton, showToast } from '../components/feedback.js';
import { statusBadge } from '../components/status.js';
import { escapeHtml } from '../utils/escape-html.js';
import { vehicleImage } from '../utils/vehicle-media.js';
import { fetchAssignedVehicle, submitPreTripInspection } from '../services/driver-service.js';

renderPage({
  eyebrow: 'Driver workspace',
  title: 'Driver Dashboard',
  description: 'Review your assigned vehicle and complete the pre-trip inspection check-in.',
  content: `
    <section id="driver-content" aria-live="polite">${loadingSkeleton(4)}</section>
  `,
});

const content = document.querySelector('#driver-content');
let inspectionSort = { key: 'created_at', direction: 'desc' };

function inspectionSortButton(key, label) {
  const active = inspectionSort.key === key;
  const nextDirection = active && inspectionSort.direction === 'asc' ? 'desc' : 'asc';
  const icon = active
    ? (inspectionSort.direction === 'asc' ? 'bi-sort-up' : 'bi-sort-down')
    : 'bi-arrow-down-up';
  return `<button class="btn btn-link table-sort-button p-0 text-reset fw-bold" type="button" data-inspection-sort="${key}" aria-label="Sort ${label} ${nextDirection === 'asc' ? 'ascending' : 'descending'}">${label} <i class="bi ${icon}" aria-hidden="true"></i></button>`;
}

function formatInspectionDateTime(value) {
  if (!value) return '—';
  const parts = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(value)).reduce((result, part) => {
    result[part.type] = part.value;
    return result;
  }, {});
  return `${parts.month}.${parts.day}.${parts.year}, ${parts.hour}:${parts.minute}`;
}

function renderVehicle(vehicle) {
  const cargo = vehicle.vehicle_cargo_profiles?.[0];
  const inspection = vehicle.inspections?.[0];
  const inspections = vehicle.inspections || [];
  const sortedInspections = [...inspections].sort((left, right) => {
    let comparison;
    if (inspectionSort.key === 'odometer_reading') {
      comparison = Number(left.odometer_reading || 0) - Number(right.odometer_reading || 0);
    } else if (inspectionSort.key === 'passes_check') {
      comparison = Number(Boolean(left.passes_check)) - Number(Boolean(right.passes_check));
    } else {
      comparison = new Date(left.created_at || left.inspection_date).getTime()
        - new Date(right.created_at || right.inspection_date).getTime();
    }
    return inspectionSort.direction === 'asc' ? comparison : -comparison;
  });
  const inspectionRows = sortedInspections.map((item) => `
    <tr>
      <td>${escapeHtml(formatInspectionDateTime(item.created_at || item.inspection_date))}</td>
      <td><span class="${item.passes_check ? 'text-success' : 'text-danger'}">${item.passes_check ? 'Passed' : 'Failed'}</span></td>
      <td>${Number(item.odometer_reading || 0).toLocaleString()} km</td>
      <td>${item.photo_url ? `<a href="${escapeHtml(item.photo_url)}" target="_blank" rel="noopener noreferrer"><img class="inspection-photo" src="${escapeHtml(item.photo_url)}" alt="Odometer photo from ${escapeHtml(formatInspectionDateTime(item.created_at || item.inspection_date))}" loading="lazy"></a>` : '<span class="text-secondary">No photo</span>'}</td>
    </tr>
  `).join('');
  content.innerHTML = `
    <div class="row g-4">
      <div class="col-lg-5">
        <article class="vehicle-card h-100">
          ${vehicleImage(vehicle)}
          <div class="d-flex justify-content-between align-items-start gap-3 mb-4">
            <div>
              <p class="vehicle-plate mb-1">${escapeHtml(vehicle.license_plate)}</p>
              <h2 class="h4 mb-0">${escapeHtml(vehicle.brand_model)}</h2>
            </div>
            ${statusBadge(vehicle.status)}
          </div>
          <dl class="vehicle-details mb-0">
            <div><dt>Mileage</dt><dd>${Number(vehicle.mileage).toLocaleString()} km</dd></div>
            <div><dt>Fuel / battery</dt><dd>${vehicle.fuel_battery_level}%</dd></div>
            <div><dt>Cargo capacity</dt><dd>${cargo ? `${Number(cargo.max_cargo_kg).toLocaleString()} kg` : 'Not recorded'}</dd></div>
            <div><dt>Latest inspection</dt><dd>${inspection ? (inspection.passes_check ? 'Passed' : 'Failed') : 'Not recorded'}</dd></div>
          </dl>
        </article>
      </div>
      <div class="col-lg-7">
        <article class="placeholder-card p-4 p-md-5">
          <div class="d-flex justify-content-between align-items-start gap-3 mb-3">
            <div>
              <p class="eyebrow mb-2">Pre-trip check-in</p>
              <h2 class="h4">Safety inspection</h2>
            </div>
            <i class="bi bi-clipboard2-check fs-2 text-primary" aria-hidden="true"></i>
          </div>
          <p class="text-secondary">Record the current odometer reading and upload a clear photo before starting your route.</p>
          <form id="inspection-form" novalidate>
            <div class="mb-3">
              <label class="form-label" for="odometer-reading">Current odometer reading (km)</label>
              <input class="form-control" id="odometer-reading" type="number" min="0" step="1" inputmode="numeric" required>
              <div class="invalid-feedback">Enter a non-negative whole-number odometer reading.</div>
            </div>
            <div class="mb-3">
              <label class="form-label" for="odometer-photo">Odometer photo</label>
              <input class="form-control" id="odometer-photo" type="file" accept="image/*" required>
              <div class="form-text">Image files only, maximum 10 MB.</div>
              <div class="invalid-feedback">Select an odometer photo.</div>
            </div>
            <div class="form-check mb-3">
              <input class="form-check-input" id="passes-check" type="checkbox" required>
              <label class="form-check-label" for="passes-check">I confirm the vehicle passed my pre-trip safety checks.</label>
              <div class="invalid-feedback">Confirm the safety checks before submitting.</div>
            </div>
            <button class="btn btn-primary" type="submit">
              <i class="bi bi-cloud-arrow-up me-1" aria-hidden="true"></i>Submit inspection
            </button>
          </form>
        </article>
      </div>
    </div>
    <section class="placeholder-card p-4 mt-4" aria-labelledby="inspection-history-heading">
      <div class="d-flex justify-content-between align-items-center gap-3 mb-3">
        <div>
          <p class="eyebrow mb-2">Saved submissions</p>
          <h2 class="h4 mb-0" id="inspection-history-heading">Inspection history</h2>
        </div>
        <span class="badge text-bg-light">${inspections.length} record${inspections.length === 1 ? '' : 's'}</span>
      </div>
      ${inspections.length ? `<div class="table-responsive"><table class="table align-middle mb-0"><caption class="visually-hidden">Submitted vehicle inspections</caption><thead><tr><th scope="col" aria-sort="${inspectionSort.key === 'created_at' ? inspectionSort.direction : 'none'}">${inspectionSortButton('created_at', 'Date & time')}</th><th scope="col" aria-sort="${inspectionSort.key === 'passes_check' ? inspectionSort.direction : 'none'}">${inspectionSortButton('passes_check', 'Result')}</th><th scope="col" aria-sort="${inspectionSort.key === 'odometer_reading' ? inspectionSort.direction : 'none'}">${inspectionSortButton('odometer_reading', 'Odometer')}</th><th scope="col">Photo</th></tr></thead><tbody>${inspectionRows}</tbody></table></div>` : '<p class="text-secondary mb-0">No inspections have been submitted for this vehicle yet.</p>'}
    </section>
  `;
  content.querySelectorAll('[data-inspection-sort]').forEach((button) => button.addEventListener('click', () => {
    const key = button.dataset.inspectionSort;
    inspectionSort = inspectionSort.key === key
      ? { key, direction: inspectionSort.direction === 'asc' ? 'desc' : 'asc' }
      : { key, direction: 'asc' };
    renderVehicle(vehicle);
  }));
  document.querySelector('#inspection-form').addEventListener('submit', (event) => handleSubmit(event, vehicle));
}

function renderNoVehicle() {
  content.innerHTML = emptyState({
    icon: 'bi-truck',
    title: 'No vehicle assigned',
    message: 'A Fleet Manager must assign an active vehicle before you can submit a pre-trip inspection.',
  });
}

async function handleSubmit(event, vehicle) {
  event.preventDefault();
  const form = event.currentTarget;
  form.classList.add('was-validated');
  if (!form.checkValidity()) return;

  const button = form.querySelector('button[type="submit"]');
  button.disabled = true;
  try {
    await submitPreTripInspection({
      vehicleId: vehicle.id,
      odometerReading: Number(document.querySelector('#odometer-reading').value),
      passesCheck: document.querySelector('#passes-check').checked,
      photo: document.querySelector('#odometer-photo').files[0],
    });
    const refreshedVehicle = await fetchAssignedVehicle(vehicle.id);
    showToast(`Inspection submitted for ${vehicle.license_plate}.`, { title: 'Inspection saved', variant: 'success' });
    renderVehicle(refreshedVehicle || vehicle);
  } catch (error) {
    showToast(error.message, { title: 'Inspection failed', variant: 'danger' });
  } finally {
    button.disabled = false;
  }
}

try {
  const vehicle = await fetchAssignedVehicle(new URLSearchParams(window.location.search).get('vehicle_id'));
  if (vehicle) {
    const requestedVehicleId = new URLSearchParams(window.location.search).get('vehicle_id');
    if (requestedVehicleId) {
      showToast('The assigned vehicle is selected automatically for your account.', { title: 'Vehicle selection', variant: 'info' });
    }
    renderVehicle(vehicle);
  } else {
    renderNoVehicle();
  }
} catch (error) {
  content.innerHTML = emptyState({ icon: 'bi-database-exclamation', title: 'Driver data unavailable', message: error.message });
  showToast(error.message, { title: 'Dashboard error', variant: 'danger' });
}
