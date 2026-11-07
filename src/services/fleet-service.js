import { supabaseClient } from './supabase-client.js';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const STATUSES = new Set(['active', 'maintenance', 'out_of_service']);
const SORT_FIELDS = new Set(['mileage', 'fuel_battery_level', 'updated_at']);
const DIRECTIONS = new Set(['asc', 'desc']);

function requireSupabase() {
  if (!supabaseClient) {
    throw new Error('Supabase is not configured. Set the VITE_SUPABASE_URL and publishable key.');
  }
}

function validateText(value, label, maxLength = 100) {
  if (value == null || value === '') return null;
  if (value.length > maxLength) throw new Error(`${label} is too long.`);
  return value;
}

function validateOptions(options = {}) {
  const status = options.status || null;
  const sort = options.sort || 'updated_at';
  const direction = options.direction || 'desc';
  const vehicleId = options.vehicleId || null;
  const driverName = validateText(options.driverName, 'Assigned driver filter', 120);
  const search = validateText(options.search, 'Vehicle search', 80);

  if (status && !STATUSES.has(status)) throw new Error('Invalid vehicle status filter.');
  if (!SORT_FIELDS.has(sort)) throw new Error('Invalid vehicle sort field.');
  if (!DIRECTIONS.has(direction)) throw new Error('Invalid vehicle sort direction.');
  if (vehicleId && !UUID_PATTERN.test(vehicleId)) throw new Error('Invalid vehicle_id parameter.');
  if (search && /[%_,]/.test(search)) throw new Error('Vehicle search contains invalid wildcard characters.');

  return { status, sort, direction, vehicleId, driverName, search };
}

function summarizeVehicle(vehicle) {
  const inspections = Array.isArray(vehicle.inspections) ? vehicle.inspections : [];
  const maintenanceLogs = Array.isArray(vehicle.maintenance_logs) ? vehicle.maintenance_logs : [];
  const recentInspection = inspections[0] || null;
  const alerts = maintenanceLogs.filter((log) => ['pending', 'approved'].includes(log.status));

  return {
    license_plate: vehicle.license_plate,
    brand_model: vehicle.brand_model,
    status: vehicle.status,
    mileage: vehicle.mileage,
    fuel_battery_level: vehicle.fuel_battery_level,
    updated_at: vehicle.updated_at,
    assigned_driver_name: vehicle.assigned_driver?.full_name || null,
    cargo: vehicle.vehicle_cargo_profiles?.[0] || null,
    recent_inspection: recentInspection
      ? { passes_check: recentInspection.passes_check, inspection_date: recentInspection.inspection_date }
      : null,
    maintenance_alerts: alerts.map((log) => ({
      status: log.status,
      created_at: log.created_at,
    })),
  };
}

export async function fetchDriverFilterOptions() {
  requireSupabase();
  const { data: roleRows, error: roleError } = await supabaseClient
    .from('user_roles')
    .select('user_id')
    .eq('role', 'driver');

  if (roleError) throw new Error(`Driver filters could not be loaded: ${roleError.message}`);
  const driverIds = (roleRows || []).map((row) => row.user_id);
  if (!driverIds.length) return [];

  const { data, error } = await supabaseClient
    .from('profiles')
    .select('full_name')
    .in('id', driverIds)
    .not('full_name', 'is', null)
    .order('full_name');

  if (error) throw new Error(`Driver filters could not be loaded: ${error.message}`);
  return [...new Set((data || []).map((profile) => profile.full_name).filter(Boolean))];
}

export async function fetchFleetOverview(options = {}) {
  requireSupabase();
  const filters = validateOptions(options);
  let driverId = null;

  if (filters.driverName) {
    const { data: drivers, error: driverError } = await supabaseClient
      .from('profiles')
      .select('id')
      .eq('full_name', filters.driverName)
      .limit(100);

    if (driverError) throw new Error(`Assigned driver filter could not be applied: ${driverError.message}`);
    const driverIds = (drivers || []).map((driver) => driver.id);
    if (!driverIds.length) return { vehicles: [], summary: { total: 0, active: 0, maintenance: 0, outOfService: 0 } };
    driverId = driverIds;
  }

  let query = supabaseClient
    .from('vehicles')
    .select(`
      license_plate,
      brand_model,
      status,
      mileage,
      fuel_battery_level,
      updated_at,
      assigned_driver:profiles!vehicles_assigned_driver_id_fkey (full_name),
      vehicle_cargo_profiles (cargo_type, max_cargo_kg, current_cargo_kg, load_status),
      inspections (passes_check, inspection_date),
      maintenance_logs (status, created_at)
    `);

  if (filters.vehicleId) query = query.eq('id', filters.vehicleId);
  if (filters.status) query = query.eq('status', filters.status);
  if (driverId) query = query.in('assigned_driver_id', driverId);
  if (filters.search) {
    const escapedSearch = filters.search.replaceAll(',', '');
    query = query.or(`license_plate.ilike.%${escapedSearch}%,brand_model.ilike.%${escapedSearch}%`);
  }

  query = query
    .order(filters.sort, { ascending: filters.direction === 'asc' })
    .order('license_plate', { ascending: true })
    .order('inspection_date', { foreignTable: 'inspections', ascending: false })
    .order('created_at', { foreignTable: 'maintenance_logs', ascending: false });

  const { data, error } = await query;
  if (error) throw new Error(`Fleet vehicles could not be loaded: ${error.message}`);

  const vehicles = (data || []).map(summarizeVehicle);
  const summary = vehicles.reduce((counts, vehicle) => {
    counts.total += 1;
    if (vehicle.status === 'active') counts.active += 1;
    if (vehicle.status === 'maintenance') counts.maintenance += 1;
    if (vehicle.status === 'out_of_service') counts.outOfService += 1;
    return counts;
  }, { total: 0, active: 0, maintenance: 0, outOfService: 0 });

  return { vehicles, summary };
}
