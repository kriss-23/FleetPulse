import { supabaseClient } from './supabase-client.js';
import { getCurrentUser } from './auth.js';
import { fetchAssignedVehicle } from './driver-service.js';

const BUCKET = 'fleet-uploads';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function requireSupabase() {
  if (!supabaseClient) {
    throw new Error('Supabase is not configured. Set the VITE_SUPABASE_URL and publishable key.');
  }
}

function validatePhoto(photo) {
  if (!photo) return;
  if (!photo.type.startsWith('image/')) throw new Error('The issue photo must be an image.');
  if (photo.size > 10 * 1024 * 1024) throw new Error('The issue photo must be 10 MB or smaller.');
}

export async function fetchReportVehicle(vehicleId = null) {
  if (vehicleId && !UUID_PATTERN.test(vehicleId)) {
    throw new Error('The vehicle_id parameter is invalid.');
  }
  return fetchAssignedVehicle(vehicleId);
}

export async function submitDailyReport({
  vehicleId,
  shiftDate,
  shiftStartedAt,
  shiftEndedAt,
  drivingHours,
  endMileage,
  fuelBatteryRemaining,
  issueDescription,
  issueUrgency,
  issuePhoto,
}) {
  requireSupabase();
  const user = await getCurrentUser();
  if (!user) throw new Error('Your session has expired. Sign in again.');
  if (!vehicleId || !UUID_PATTERN.test(vehicleId)) throw new Error('An assigned vehicle is required.');
  if (!Number.isFinite(drivingHours) || drivingHours < 0 || drivingHours > 9) {
    throw new Error('Driving hours must be between zero and nine.');
  }
  if (endMileage != null && (!Number.isInteger(endMileage) || endMileage < 0)) {
    throw new Error('End mileage must be a non-negative whole number.');
  }
  if (fuelBatteryRemaining != null && (!Number.isInteger(fuelBatteryRemaining) || fuelBatteryRemaining < 0 || fuelBatteryRemaining > 100)) {
    throw new Error('Fuel or battery level must be between zero and 100.');
  }
  if (!['none', 'low', 'urgent'].includes(issueUrgency)) throw new Error('Invalid issue urgency.');
  if (!shiftDate || !shiftStartedAt || !shiftEndedAt || new Date(shiftEndedAt) <= new Date(shiftStartedAt)) {
    throw new Error('Enter a valid shift date, start time, and end time.');
  }
  validatePhoto(issuePhoto);

  const requestId = crypto.randomUUID();
  let objectPath = null;
  if (issuePhoto) {
    const extension = issuePhoto.name.includes('.') ? issuePhoto.name.split('.').pop().toLowerCase() : 'jpg';
    objectPath = `${user.id}/issues/${requestId}.${extension}`;
    const { error: uploadError } = await supabaseClient.storage
      .from(BUCKET)
      .upload(objectPath, issuePhoto, { contentType: issuePhoto.type, upsert: false });
    if (uploadError) throw new Error(`Issue photo upload failed: ${uploadError.message}`);
  }

  const { data, error } = await supabaseClient.rpc('submit_daily_report', {
    p_vehicle_id: vehicleId,
    p_shift_date: shiftDate,
    p_shift_started_at: shiftStartedAt,
    p_shift_ended_at: shiftEndedAt,
    p_driving_hours: drivingHours,
    p_end_mileage: endMileage,
    p_fuel_battery_remaining: fuelBatteryRemaining,
    p_issue_description: issueDescription || null,
    p_issue_urgency: issueUrgency,
    p_issue_photo_url: objectPath,
    p_request_id: requestId,
    p_fuel_unit_cost: 0,
  });

  if (error) {
    if (objectPath) await supabaseClient.storage.from(BUCKET).remove([objectPath]);
    throw new Error(`Daily report could not be submitted: ${error.message}`);
  }
  let issuePhotoUrl = null;
  if (objectPath) {
    const { data: signedPhoto, error: signedPhotoError } = await supabaseClient.storage
      .from(BUCKET)
      .createSignedUrl(objectPath, 300);
    if (signedPhotoError) throw new Error(`Saved issue photo could not be loaded: ${signedPhotoError.message}`);
    issuePhotoUrl = signedPhoto.signedUrl;
  }
  return { ...data, issue_photo_url: issuePhotoUrl, issue_urgency: issueUrgency };
}
