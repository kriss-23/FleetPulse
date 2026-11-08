import { supabaseClient } from './supabase-client.js';
import { getAuthenticatedContext, getCurrentUser } from './auth.js';

const BUCKET = 'fleet-uploads';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function requireSupabase() {
  if (!supabaseClient) {
    throw new Error('Supabase is not configured. Set the VITE_SUPABASE_URL and publishable key.');
  }
}

export async function fetchAssignedVehicle(vehicleId = null) {
  requireSupabase();
  const context = await getAuthenticatedContext();
  const user = context.user;
  if (!user) throw new Error('Sign in to view your assigned vehicle.');
  if (vehicleId && !UUID_PATTERN.test(vehicleId)) throw new Error('The vehicle_id parameter is invalid.');
  const canViewSelectedVehicle = Boolean(vehicleId && ['manager', 'warehouse', 'accountant'].includes(context.role));

  const { data, error } = await supabaseClient
    .from('vehicles')
    .select(`
      id,
      license_plate,
      brand_model,
      status,
      mileage,
      fuel_battery_level,
      vehicle_cargo_profiles (cargo_type, max_cargo_kg, current_cargo_kg, load_status),
      inspections (passes_check, odometer_reading, inspection_date, created_at)
    `)
    .eq(canViewSelectedVehicle ? 'id' : 'assigned_driver_id', canViewSelectedVehicle ? vehicleId : user.id)
    .order('inspection_date', { foreignTable: 'inspections', ascending: false })
    .maybeSingle();

  if (error) throw new Error(`Assigned vehicle could not be loaded: ${error.message}`);
  return data || null;
}

export async function submitPreTripInspection({ vehicleId, odometerReading, passesCheck, photo }) {
  requireSupabase();
  const user = await getCurrentUser();
  if (!user) throw new Error('Your session has expired. Sign in again.');
  if (!vehicleId || !Number.isInteger(odometerReading) || odometerReading < 0) {
    throw new Error('Enter a valid odometer reading.');
  }
  if (!passesCheck) throw new Error('Confirm all pre-trip safety checks before submitting.');
  if (!(photo instanceof File)) throw new Error('Select an odometer photo.');
  if (!photo.type.startsWith('image/')) throw new Error('The odometer photo must be an image.');
  if (photo.size > 10 * 1024 * 1024) throw new Error('The odometer photo must be 10 MB or smaller.');

  const requestId = crypto.randomUUID();
  const extension = photo.name.includes('.') ? photo.name.split('.').pop().toLowerCase() : 'jpg';
  const objectPath = `${user.id}/${requestId}.${extension}`;
  const { error: uploadError } = await supabaseClient.storage
    .from(BUCKET)
    .upload(objectPath, photo, { contentType: photo.type, upsert: false });

  if (uploadError) throw new Error(`Odometer photo upload failed: ${uploadError.message}`);

  const inspectionDate = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabaseClient.rpc('submit_inspection', {
    p_vehicle_id: vehicleId,
    p_passes_check: passesCheck,
    p_odometer_reading: odometerReading,
    p_odometer_photo_url: objectPath,
    p_inspection_date: inspectionDate,
    p_request_id: requestId,
  });

  if (error) {
    await supabaseClient.storage.from(BUCKET).remove([objectPath]);
    throw new Error(`Pre-trip inspection could not be submitted: ${error.message}`);
  }
  return data;
}
