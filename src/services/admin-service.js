import { supabaseClient } from './supabase-client.js';
import { getAuthenticatedContext } from './auth.js';

const STATUSES = new Set(['active', 'maintenance', 'out_of_service']);

function requireSupabase() {
  if (!supabaseClient) {
    throw new Error('Supabase is not configured. Set the VITE_SUPABASE_URL and publishable key.');
  }
}

async function requireManager() {
  requireSupabase();
  const context = await getAuthenticatedContext();
  if (!context.user || context.role !== 'manager') {
    throw new Error('Fleet Manager access is required for this panel.');
  }
  return context.user;
}

function requestId() {
  return crypto.randomUUID();
}

export async function fetchAdminData() {
  await requireManager();
  const { data: roleRows, error: roleError } = await supabaseClient
    .from('user_roles')
    .select('user_id')
    .eq('role', 'driver');
  if (roleError) throw new Error(`Driver roles could not be loaded: ${roleError.message}`);
  const driverIds = (roleRows || []).map((row) => row.user_id);
  const [vehiclesResult, driversResult, maintenanceResult] = await Promise.all([
    supabaseClient
      .from('vehicles')
      .select('id, license_plate, brand_model, status, mileage, fuel_battery_level, assigned_driver_id, updated_at, assigned_driver:profiles!vehicles_assigned_driver_id_fkey(id, full_name), inspections(passes_check, inspection_date, created_at)')
      .order('license_plate')
      .order('inspection_date', { foreignTable: 'inspections', ascending: false }),
    driverIds.length
      ? supabaseClient.from('profiles').select('id, full_name').in('id', driverIds).order('full_name')
      : Promise.resolve({ data: [], error: null }),
    supabaseClient
      .from('maintenance_logs')
      .select('id, vehicle_id, report_id, service_cost, invoice_pdf_url, status, created_at, updated_at, vehicle:vehicles!maintenance_logs_vehicle_id_fkey(license_plate, brand_model)')
      .in('status', ['pending', 'approved'])
      .order('created_at', { ascending: false }),
  ]);
  if (vehiclesResult.error) throw new Error(`Vehicles could not be loaded: ${vehiclesResult.error.message}`);
  if (driversResult.error) throw new Error(`Drivers could not be loaded: ${driversResult.error.message}`);
  if (maintenanceResult.error) throw new Error(`Maintenance requests could not be loaded: ${maintenanceResult.error.message}`);
  return {
    vehicles: vehiclesResult.data || [],
    drivers: driversResult.data || [],
    maintenance: maintenanceResult.data || [],
  };
}

export async function assignVehicle({ vehicleId, driverId, shiftDate, shiftStartedAt, shiftEndedAt, reassign = false }) {
  await requireManager();
  if (!vehicleId || !driverId || !shiftDate || !shiftStartedAt || !shiftEndedAt) {
    throw new Error('Vehicle, driver, shift date, start, and end are required.');
  }
  if (new Date(shiftEndedAt) <= new Date(shiftStartedAt)) throw new Error('Shift end must be after shift start.');
  const rpc = reassign ? 'reassign_vehicle' : 'assign_vehicle';
  const params = reassign
    ? { p_vehicle_id: vehicleId, p_driver_id: driverId, p_shift_date: shiftDate, p_shift_started_at: shiftStartedAt, p_shift_ended_at: shiftEndedAt, p_request_id: requestId() }
    : { p_vehicle_id: vehicleId, p_driver_id: driverId, p_shift_date: shiftDate, p_shift_started_at: shiftStartedAt, p_shift_ended_at: shiftEndedAt, p_request_id: requestId() };
  const { data, error } = await supabaseClient.rpc(rpc, params);
  if (error) throw new Error(`Vehicle assignment failed: ${error.message}`);
  return data;
}

export async function updateVehicleStatus(vehicleId, status) {
  await requireManager();
  if (!STATUSES.has(status)) throw new Error('Invalid vehicle status.');
  const { data, error } = await supabaseClient.rpc('update_vehicle_status', {
    p_vehicle_id: vehicleId,
    p_status: status,
    p_request_id: requestId(),
  });
  if (error) throw new Error(`Vehicle status could not be updated: ${error.message}`);
  return data;
}

export async function updateMaintenance({ maintenanceId, status, serviceCost }) {
  await requireManager();
  if (!['approved', 'completed'].includes(status)) throw new Error('Select an approval or completion status.');
  if (!Number.isFinite(serviceCost) || serviceCost < 0) throw new Error('Service cost must be zero or greater.');
  const { data, error } = await supabaseClient.rpc('approve_maintenance', {
    p_maintenance_log_id: maintenanceId,
    p_status: status,
    p_parts_cost: serviceCost,
    p_labor_cost: 0,
    p_request_id: requestId(),
  });
  if (error) throw new Error(`Maintenance request could not be updated: ${error.message}`);
  return data;
}
