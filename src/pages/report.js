import { renderPage } from '../components/page-shell.js';
import { emptyState, loadingSkeleton, showToast } from '../components/feedback.js';
import { statusBadge } from '../components/status.js';
import { escapeHtml } from '../utils/escape-html.js';
import { fetchReportVehicle, submitDailyReport } from '../services/report-service.js';

renderPage({
  eyebrow: 'Driver workspace',
  title: 'Daily Shift Report',
  description: 'Record end-of-shift metrics and flag vehicle issues for follow-up.',
  content: `<section id="report-content" aria-live="polite">${loadingSkeleton(5)}</section>`,
});

const content = document.querySelector('#report-content');

function localDateTimeValue(date) {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function renderReportForm(vehicle) {
  const now = new Date();
  const start = new Date(now);
  start.setHours(Math.max(0, start.getHours() - 8));
  content.innerHTML = `
    <div class="row g-4">
      <div class="col-lg-4">
        <article class="vehicle-card h-100">
          <div class="d-flex justify-content-between align-items-start gap-3 mb-4">
            <div>
              <p class="vehicle-plate mb-1">${escapeHtml(vehicle.license_plate)}</p>
              <h2 class="h4 mb-0">${escapeHtml(vehicle.brand_model)}</h2>
            </div>
            ${statusBadge(vehicle.status)}
          </div>
          <dl class="vehicle-details mb-0">
            <div><dt>Current mileage</dt><dd>${Number(vehicle.mileage).toLocaleString()} km</dd></div>
            <div><dt>Fuel / battery</dt><dd>${vehicle.fuel_battery_level}%</dd></div>
          </dl>
          <a class="btn btn-outline-primary w-100 mt-4" href="/driver.html?vehicle_id=${encodeURIComponent(vehicle.id)}">Open driver dashboard</a>
        </article>
      </div>
      <div class="col-lg-8">
        <article class="placeholder-card p-4 p-md-5">
          <form id="report-form" novalidate>
            <fieldset>
              <legend class="h4">Shift details</legend>
              <div class="row g-3">
                <div class="col-md-4">
                  <label class="form-label" for="shift-date">Shift date</label>
                  <input class="form-control" id="shift-date" type="date" value="${now.toISOString().slice(0, 10)}" required>
                </div>
                <div class="col-md-4">
                  <label class="form-label" for="shift-start">Shift started</label>
                  <input class="form-control" id="shift-start" type="datetime-local" value="${localDateTimeValue(start)}" required>
                </div>
                <div class="col-md-4">
                  <label class="form-label" for="shift-end">Shift ended</label>
                  <input class="form-control" id="shift-end" type="datetime-local" value="${localDateTimeValue(now)}" required>
                </div>
              </div>
            </fieldset>
            <hr class="my-4">
            <fieldset>
              <legend class="h4">End-of-shift metrics</legend>
              <div class="row g-3">
                <div class="col-md-4">
                  <label class="form-label" for="driving-hours">Total driving hours</label>
                  <input class="form-control" id="driving-hours" type="number" min="0" max="9" step="0.25" inputmode="decimal" required>
                  <div class="invalid-feedback">Enter between 0 and 9 hours.</div>
                  <div id="hours-warning" class="form-text text-danger d-none" role="alert">Driving time cannot exceed the legal 9-hour daily limit.</div>
                </div>
                <div class="col-md-4">
                  <label class="form-label" for="end-mileage">End mileage (km)</label>
                  <input class="form-control" id="end-mileage" type="number" min="0" step="1" inputmode="numeric" required>
                  <div class="invalid-feedback">Enter a non-negative whole number.</div>
                </div>
                <div class="col-md-4">
                  <label class="form-label" for="fuel-level">Fuel / battery remaining (%)</label>
                  <input class="form-control" id="fuel-level" type="number" min="0" max="100" step="1" inputmode="numeric" required>
                  <div class="invalid-feedback">Enter a value between 0 and 100.</div>
                </div>
              </div>
            </fieldset>
            <hr class="my-4">
            <fieldset>
              <legend class="h4">Issue reporting</legend>
              <div class="mb-3">
                <label class="form-label" for="issue-description">Vehicle problem description</label>
                <textarea class="form-control" id="issue-description" rows="3" maxlength="2000" placeholder="Describe any issue found during the shift"></textarea>
              </div>
              <div class="row g-3">
                <div class="col-md-6">
                  <label class="form-label" for="issue-urgency">Issue urgency</label>
                  <select class="form-select" id="issue-urgency">
                    <option value="none">No issue</option>
                    <option value="low">Low warning 🟡</option>
                    <option value="urgent">Urgent alert 🔴</option>
                  </select>
                </div>
                <div class="col-md-6">
                  <label class="form-label" for="issue-photo">Issue photo</label>
                  <input class="form-control" id="issue-photo" type="file" accept="image/*">
                  <div class="form-text">Optional image, maximum 10 MB.</div>
                </div>
              </div>
            </fieldset>
            <button class="btn btn-primary mt-4" type="submit"><i class="bi bi-send me-1" aria-hidden="true"></i>Submit daily report</button>
          </form>
        </article>
      </div>
    </div>
  `;
  const form = document.querySelector('#report-form');
  const hours = document.querySelector('#driving-hours');
  const warning = document.querySelector('#hours-warning');
  hours.addEventListener('input', () => {
    const exceeded = Number(hours.value) > 9;
    hours.classList.toggle('is-invalid', exceeded);
    warning.classList.toggle('d-none', !exceeded);
  });
  form.addEventListener('submit', (event) => handleSubmit(event, vehicle));
}

async function handleSubmit(event, vehicle) {
  event.preventDefault();
  const form = event.currentTarget;
  form.classList.add('was-validated');
  const drivingHours = Number(document.querySelector('#driving-hours').value);
  if (!form.checkValidity() || drivingHours > 9) {
    if (drivingHours > 9) showToast('Driving hours exceed the legal 9-hour limit.', { title: 'Report blocked', variant: 'danger' });
    return;
  }
  const button = form.querySelector('button[type="submit"]');
  button.disabled = true;
  try {
    const result = await submitDailyReport({
      vehicleId: vehicle.id,
      shiftDate: document.querySelector('#shift-date').value,
      shiftStartedAt: new Date(document.querySelector('#shift-start').value).toISOString(),
      shiftEndedAt: new Date(document.querySelector('#shift-end').value).toISOString(),
      drivingHours,
      endMileage: Number(document.querySelector('#end-mileage').value),
      fuelBatteryRemaining: Number(document.querySelector('#fuel-level').value),
      issueDescription: document.querySelector('#issue-description').value.trim(),
      issueUrgency: document.querySelector('#issue-urgency').value,
      issuePhoto: document.querySelector('#issue-photo').files[0] || null,
    });
    showToast(`Daily report ${result.report_id ? 'saved' : 'processed'} for ${vehicle.license_plate}.`, { title: 'Report submitted', variant: 'success' });
    form.reset();
    form.classList.remove('was-validated');
  } catch (error) {
    showToast(error.message, { title: 'Report failed', variant: 'danger' });
  } finally {
    button.disabled = false;
  }
}

try {
  const vehicle = await fetchReportVehicle(new URLSearchParams(window.location.search).get('vehicle_id'));
  if (vehicle) renderReportForm(vehicle);
  else content.innerHTML = emptyState({ icon: 'bi-truck', title: 'No vehicle assigned', message: 'A Fleet Manager must assign an active vehicle before you can submit a daily report.' });
} catch (error) {
  content.innerHTML = emptyState({ icon: 'bi-database-exclamation', title: 'Report data unavailable', message: error.message });
  showToast(error.message, { title: 'Report error', variant: 'danger' });
}
