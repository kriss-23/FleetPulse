import 'dotenv/config';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { createClient } from '@supabase/supabase-js';

const ROOT = path.resolve(import.meta.dirname, '..');
const EXPECTED_PROJECT_REF = 'skfnptxtjmsjehikrlma';
const dryRun = process.argv.includes('--dry-run');
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseUrl = process.env.SUPABASE_URL;
const projectRef = process.env.SUPABASE_PROJECT_REF;
const demoPassword = process.env.FLEETPULSE_DEMO_PASSWORD;

if (!serviceRoleKey || !supabaseUrl || !projectRef || !demoPassword) {
  throw new Error(
    'Missing SUPABASE_URL, SUPABASE_PROJECT_REF, SUPABASE_SERVICE_ROLE_KEY, '
    + 'or FLEETPULSE_DEMO_PASSWORD in the server-only .env file.'
  );
}

if (projectRef !== EXPECTED_PROJECT_REF) {
  throw new Error(`Refusing to seed project "${projectRef}". Expected "${EXPECTED_PROJECT_REF}".`);
}

const hostname = new URL(supabaseUrl).hostname;
if (hostname !== `${EXPECTED_PROJECT_REF}.supabase.co`) {
  throw new Error(`SUPABASE_URL points to "${hostname}", not the expected Supabase project.`);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const accounts = [
  { key: 'manager', email: 'manager.demo@fleetpulse.local', name: 'Morgan Fleet Manager', role: 'manager' },
  { key: 'accountant', email: 'accountant.demo@fleetpulse.local', name: 'Avery Accountant', role: 'accountant' },
  { key: 'warehouse', email: 'warehouse.demo@fleetpulse.local', name: 'Jordan Warehouse Specialist', role: 'warehouse' },
  { key: 'driverOne', email: 'driver.one.demo@fleetpulse.local', name: 'Casey Bennett', role: 'driver' },
  { key: 'driverTwo', email: 'driver.two.demo@fleetpulse.local', name: 'Riley Harper', role: 'driver' },
];

const vehicles = [
  {
    key: 'activeVan',
    license_plate: 'FP-101',
    brand_model: 'Mercedes-Benz Sprinter 319 CDI',
    energy_type: 'combustion',
    status: 'active',
    mileage: 84210,
    fuel_battery_level: 78,
    cargo_type: 'Parcel deliveries',
    max_cargo_kg: 1200,
    current_cargo_kg: 680,
    load_status: 'loaded',
    cargo_notes: 'Route A parcels and returnable packaging.',
  },
  {
    key: 'activeTruck',
    license_plate: 'FP-102',
    brand_model: 'MAN TGM 18.290',
    energy_type: 'combustion',
    status: 'active',
    mileage: 126450,
    fuel_battery_level: 64,
    cargo_type: 'Palletized retail goods',
    max_cargo_kg: 9000,
    current_cargo_kg: 5200,
    load_status: 'loaded',
    cargo_notes: 'Mixed pallet load for the north depot.',
  },
  {
    key: 'maintenanceVan',
    license_plate: 'FP-201',
    brand_model: 'Ford Transit Custom 320',
    energy_type: 'combustion',
    status: 'maintenance',
    mileage: 67380,
    fuel_battery_level: 41,
    cargo_type: 'Empty service van',
    max_cargo_kg: 900,
    current_cargo_kg: 0,
    load_status: 'unloaded',
    cargo_notes: 'Held for scheduled brake inspection.',
  },
  {
    key: 'maintenanceEV',
    license_plate: 'FP-202',
    brand_model: 'Renault Kangoo E-Tech',
    energy_type: 'electric',
    status: 'maintenance',
    mileage: 29110,
    fuel_battery_level: 27,
    cargo_type: 'Temperature-sensitive parcels',
    max_cargo_kg: 600,
    current_cargo_kg: 0,
    load_status: 'unloaded',
    cargo_notes: 'Battery service scheduled; not route-ready.',
  },
  {
    key: 'repairTruck',
    license_plate: 'FP-301',
    brand_model: 'Iveco Eurocargo ML120E',
    energy_type: 'combustion',
    status: 'out_of_service',
    mileage: 183900,
    fuel_battery_level: 12,
    cargo_type: 'Empty freight truck',
    max_cargo_kg: 7000,
    current_cargo_kg: 0,
    load_status: 'unloaded',
    cargo_notes: 'Urgent engine repair; keys held by fleet manager.',
  },
  {
    key: 'repairVan',
    license_plate: 'FP-302',
    brand_model: 'Volkswagen Crafter 35',
    energy_type: 'combustion',
    status: 'out_of_service',
    mileage: 154220,
    fuel_battery_level: 18,
    cargo_type: 'Empty delivery van',
    max_cargo_kg: 1100,
    current_cargo_kg: 0,
    load_status: 'unloaded',
    cargo_notes: 'Urgent tire and steering repair.',
  },
];

const assetDefinitions = [
  { key: 'odometerOne', bucket: 'inspection-photos', filename: 'odometer-fp-101.jpg', contentType: 'image/jpeg' },
  { key: 'odometerTwo', bucket: 'inspection-photos', filename: 'odometer-fp-102.jpg', contentType: 'image/jpeg' },
  { key: 'issueRepairTruck', bucket: 'issue-photos', filename: 'engine-warning-fp-301.jpg', contentType: 'image/jpeg' },
  { key: 'issueRepairVan', bucket: 'issue-photos', filename: 'steering-damage-fp-302.jpg', contentType: 'image/jpeg' },
  { key: 'invoiceTruck', bucket: 'invoices', filename: 'invoice-fp-301.pdf', contentType: 'application/pdf' },
  { key: 'invoiceVan', bucket: 'invoices', filename: 'invoice-fp-302.pdf', contentType: 'application/pdf' },
];

const counts = {
  created: 0,
  updated: 0,
  skipped: 0,
  missingAssets: [],
};

function stableUuid(value) {
  const digest = crypto.createHash('sha256').update(`fleetpulse-demo:${value}`).digest();
  digest[6] = (digest[6] & 0x0f) | 0x40;
  digest[8] = (digest[8] & 0x3f) | 0x80;
  return [
    digest.subarray(0, 4).toString('hex'),
    digest.subarray(4, 6).toString('hex'),
    digest.subarray(6, 8).toString('hex'),
    digest.subarray(8, 10).toString('hex'),
    digest.subarray(10, 16).toString('hex'),
  ].join('-');
}

function recordSummary(table, operation, count = 1) {
  counts[operation] += count;
  console.log(`${operation.toUpperCase()}: ${count} ${table}`);
}

async function assertSuccess(result, operation) {
  if (result.error) {
    throw new Error(`${operation} failed: ${result.error.message}`);
  }
  return result.data;
}

async function upsertRows(table, rows, conflict = 'id') {
  if (!rows.length) return;
  if (dryRun) {
    recordSummary(table, 'created', rows.length);
    return rows;
  }

  const ids = rows.map((row) => row[conflict]);
  const existing = await assertSuccess(
    await supabase.from(table).select(conflict).in(conflict, ids),
    `Reading existing ${table}`
  );
  const existingIds = new Set(existing.map((row) => row[conflict]));
  await assertSuccess(
    await supabase.from(table).upsert(rows, { onConflict: conflict }),
    `Upserting ${table}`
  );
  const updated = rows.filter((row) => existingIds.has(row[conflict])).length;
  const created = rows.length - updated;
  recordSummary(table, 'created', created);
  recordSummary(table, 'updated', updated);
  return rows;
}

async function ensureUsers() {
  if (dryRun) {
    const users = {};
    for (const account of accounts) {
      users[account.key] = { id: stableUuid(`user:${account.email}`), email: account.email };
      recordSummary('auth users', 'created');
    }
    return users;
  }

  const byEmail = new Map();
  let page = 1;
  do {
    const result = await assertSuccess(
      await supabase.auth.admin.listUsers({ page, perPage: 1000 }),
      'Listing Auth users'
    );
    result.users.forEach((user) => byEmail.set(user.email, user));
    if (result.users.length < 1000) break;
    page += 1;
  } while (true);

  const users = {};
  for (const account of accounts) {
    let user = byEmail.get(account.email);
    if (!user) {
      const created = await assertSuccess(
        await supabase.auth.admin.createUser({
          email: account.email,
          password: demoPassword,
          email_confirm: true,
        }),
        `Creating Auth user ${account.email}`
      );
      user = created.user;
      recordSummary('auth users', 'created');
    } else {
      users[account.key] = user;
      if (!user.email_confirmed_at) {
        await assertSuccess(
          await supabase.auth.admin.updateUserById(user.id, { email_confirm: true }),
          `Confirming existing Auth user ${account.email}`
        );
        recordSummary('auth users', 'updated');
      } else {
        counts.skipped += 1;
        console.log(`SKIPPED: existing Auth user ${account.email}; password was not changed`);
      }
    }
    users[account.key] = user;
  }
  return users;
}

function demoInvoicePdf(filename) {
  const invoiceNumber = filename.replace('.pdf', '').toUpperCase();
  const lines = [
    'FleetPulse demo invoice',
    `Invoice reference: ${invoiceNumber}`,
    'Vehicle maintenance service',
    'This document is a seeded presentation record.',
  ];
  const stream = `BT /F1 18 Tf 72 720 Td (${lines[0]}) Tj 0 -32 Td /F1 12 Tf (${lines[1]}) Tj 0 -24 Td (${lines[2]}) Tj 0 -24 Td (${lines[3]}) Tj ET`;
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf, 'utf8'));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return Buffer.from(pdf, 'utf8');
}

async function uploadAssets() {
  const uploaded = {};
  if (dryRun) {
    assetDefinitions.forEach((asset) => {
      const source = path.join(ROOT, 'scripts', 'assets', asset.filename);
      const generatedDemoInvoice = asset.bucket === 'invoices' && asset.filename.endsWith('.pdf');
      if (!fs.existsSync(source) && !generatedDemoInvoice) counts.missingAssets.push(asset.filename);
    });
    return uploaded;
  }

  const buckets = await assertSuccess(await supabase.storage.listBuckets(), 'Listing Storage buckets');
  const availableBuckets = new Set(buckets.map((bucket) => bucket.name));
  for (const asset of assetDefinitions) {
    const source = path.join(ROOT, 'scripts', 'assets', asset.filename);
    const isDemoInvoice = asset.bucket === 'invoices' && asset.filename.endsWith('.pdf');
    if (!fs.existsSync(source) && !isDemoInvoice) {
      counts.missingAssets.push(asset.filename);
      continue;
    }
    if (!availableBuckets.has(asset.bucket)) {
      counts.missingAssets.push(asset.filename);
      continue;
    }
    const storagePath = `demo/${asset.filename}`;
    const file = fs.existsSync(source) ? fs.readFileSync(source) : demoInvoicePdf(asset.filename);
    await assertSuccess(
      await supabase.storage.from(asset.bucket).upload(storagePath, file, {
        contentType: asset.contentType,
        upsert: true,
      }),
      `Uploading ${asset.filename}`
    );
    uploaded[asset.key] = `${asset.bucket}/${storagePath}`;
    recordSummary('storage assets', 'created');
  }
  return uploaded;
}

async function seedData() {
  const users = await ensureUsers();
  const profiles = accounts.map((account) => ({
    id: users[account.key].id,
    full_name: account.name,
    phone: null,
    avatar_url: null,
  }));
  await upsertRows('profiles', profiles);

  const roles = accounts.map((account) => ({
    id: stableUuid(`role:${account.email}`),
    user_id: users[account.key].id,
    role: account.role,
  }));
  await upsertRows('user_roles', roles, 'user_id');

  const vehicleRows = vehicles.map((vehicle) => ({
    id: stableUuid(`vehicle:${vehicle.license_plate}`),
    license_plate: vehicle.license_plate,
    brand_model: vehicle.brand_model,
    status: vehicle.status,
    mileage: vehicle.mileage,
    fuel_battery_level: vehicle.fuel_battery_level,
    assigned_driver_id: vehicle.status === 'active'
      ? users[vehicle.key === 'activeVan' ? 'driverOne' : 'driverTwo'].id
      : null,
  }));
  await upsertRows('vehicles', vehicleRows, 'license_plate');
  const vehicleByKey = new Map(vehicleRows.map((row, index) => [vehicles[index].key, row]));

  const cargoRows = vehicles.map((vehicle) => ({
    id: stableUuid(`cargo:${vehicle.license_plate}`),
    vehicle_id: vehicleByKey.get(vehicle.key).id,
    cargo_type: vehicle.cargo_type,
    max_cargo_kg: vehicle.max_cargo_kg,
    current_cargo_kg: vehicle.current_cargo_kg,
    load_status: vehicle.load_status,
    notes: vehicle.cargo_notes,
  }));
  try {
    await upsertRows('vehicle_cargo_profiles', cargoRows, 'vehicle_id');
  } catch (error) {
    counts.skipped += cargoRows.length;
    console.warn(`SKIPPED: cargo details; vehicle_cargo_profiles is unavailable (${error.message})`);
  }

  const assets = await uploadAssets();
  const inspectionRows = [
    {
      id: stableUuid('inspection:fp-101:2026-11-05'),
      vehicle_id: vehicleByKey.get('activeVan').id,
      driver_id: users.driverOne.id,
      passes_check: true,
      odometer_reading: 84002,
      odometer_photo_url: assets.odometerOne ?? null,
      inspection_date: '2026-11-05',
    },
    {
      id: stableUuid('inspection:fp-102:2026-11-06'),
      vehicle_id: vehicleByKey.get('activeTruck').id,
      driver_id: users.driverTwo.id,
      passes_check: true,
      odometer_reading: 126190,
      odometer_photo_url: assets.odometerTwo ?? null,
      inspection_date: '2026-11-06',
    },
    {
      id: stableUuid('inspection:fp-301:2026-11-04'),
      vehicle_id: vehicleByKey.get('repairTruck').id,
      driver_id: users.driverOne.id,
      passes_check: false,
      odometer_reading: 183900,
      odometer_photo_url: null,
      inspection_date: '2026-11-04',
    },
  ];
  await upsertRows('inspections', inspectionRows);

  const reportRows = [
    {
      id: stableUuid('report:fp-101:2026-11-05'),
      vehicle_id: vehicleByKey.get('activeVan').id,
      driver_id: users.driverOne.id,
      shift_date: '2026-11-05',
      shift_started_at: '2026-11-05T06:30:00+01:00',
      shift_ended_at: '2026-11-05T14:15:00+01:00',
      driving_hours: 7.25,
      end_mileage: 84210,
      fuel_battery_remaining: 78,
      issue_description: null,
      issue_urgency: 'none',
      issue_photo_url: null,
    },
    {
      id: stableUuid('report:fp-102:2026-11-06'),
      vehicle_id: vehicleByKey.get('activeTruck').id,
      driver_id: users.driverTwo.id,
      shift_date: '2026-11-06',
      shift_started_at: '2026-11-06T05:45:00+01:00',
      shift_ended_at: '2026-11-06T17:00:00+01:00',
      driving_hours: 9.5,
      end_mileage: 126450,
      fuel_battery_remaining: 64,
      issue_description: 'Driving time exceeded the legal nine-hour threshold; manager review required.',
      issue_urgency: 'urgent',
      issue_photo_url: null,
    },
    {
      id: stableUuid('report:fp-301:2026-11-04'),
      vehicle_id: vehicleByKey.get('repairTruck').id,
      driver_id: users.driverOne.id,
      shift_date: '2026-11-04',
      shift_started_at: '2026-11-04T07:00:00+01:00',
      shift_ended_at: '2026-11-04T12:00:00+01:00',
      driving_hours: 4.5,
      end_mileage: 183900,
      fuel_battery_remaining: 12,
      issue_description: 'Engine warning and loss of power during depot return.',
      issue_urgency: 'urgent',
      issue_photo_url: assets.issueRepairTruck ?? null,
    },
  ];
  await upsertRows('daily_reports', reportRows);

  const fuelRows = [
    {
      id: stableUuid('fuel:fp-102:2026-11-06'),
      vehicle_id: vehicleByKey.get('activeTruck').id,
      driver_id: users.driverTwo.id,
      report_id: reportRows[1].id,
      shift_date: '2026-11-06',
      starting_level: 92,
      ending_level: 64,
      consumed_level: 28,
      unit_cost: 1.72,
    },
    {
      id: stableUuid('fuel:fp-101:2026-11-05'),
      vehicle_id: vehicleByKey.get('activeVan').id,
      driver_id: users.driverOne.id,
      report_id: reportRows[0].id,
      shift_date: '2026-11-05',
      starting_level: 96,
      ending_level: 78,
      consumed_level: 18,
      unit_cost: 1.68,
    },
  ];
  await upsertRows('fuel_consumption_logs', fuelRows);

  const maintenanceRows = [
    {
      id: stableUuid('maintenance:fp-301'),
      vehicle_id: vehicleByKey.get('repairTruck').id,
      report_id: reportRows[2].id,
      service_cost: 1840.5,
      invoice_pdf_url: assets.invoiceTruck ?? '',
      status: 'pending',
    },
    {
      id: stableUuid('maintenance:fp-302'),
      vehicle_id: vehicleByKey.get('repairVan').id,
      report_id: null,
      service_cost: 925.75,
      invoice_pdf_url: assets.invoiceVan ?? '',
      status: 'approved',
    },
  ];
  try {
    await upsertRows('maintenance_logs', maintenanceRows);
  } catch (error) {
    if (!error.message.includes('Maintenance records must use FleetPulse RPCs')) throw error;
    const signedIn = await assertSuccess(
      await supabase.auth.signInWithPassword({
        email: accounts.find((account) => account.key === 'manager').email,
        password: demoPassword,
      }),
      'Signing in as demo manager for invoice references'
    );
    if (!signedIn.user) throw new Error('Demo manager sign-in did not return a user.');
    for (const row of maintenanceRows) {
      if (!row.invoice_pdf_url) continue;
      await assertSuccess(
        await supabase.rpc('set_maintenance_invoice_reference', {
          p_maintenance_log_id: row.id,
          p_invoice_pdf_url: row.invoice_pdf_url,
          p_request_id: crypto.randomUUID(),
        }),
        `Updating invoice reference for ${row.id}`
      );
    }
    recordSummary('maintenance invoice references', 'updated', maintenanceRows.length);
  }
}

console.log(`${dryRun ? 'DRY RUN' : 'SEED'}: FleetPulse demo project ${EXPECTED_PROJECT_REF}`);
await seedData();
console.log('\nSummary:');
console.log(`Created: ${counts.created}`);
console.log(`Updated: ${counts.updated}`);
console.log(`Skipped: ${counts.skipped}`);
if (counts.missingAssets.length) {
  console.warn(`Missing or unavailable storage assets: ${counts.missingAssets.join(', ')}`);
}
