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

function renderVehicle(vehicle) {
  const cargo = vehicle.vehicle_cargo_profiles?.[0];
  const inspection = vehicle.inspections?.[0];
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
  `;
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
    showToast(`Inspection submitted for ${vehicle.license_plate}.`, { title: 'Inspection saved', variant: 'success' });
    form.reset();
    form.classList.remove('was-validated');
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
