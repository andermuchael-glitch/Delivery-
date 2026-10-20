import { getDb } from './db.js';
import { requireFirebaseUser, unauthorized } from './auth.js';

export const TRACKING_ADMIN_DEFAULT = 'andermuchael@gmail.com';

export function trackingAdmins() {
  return (process.env.TRACKING_ADMIN_EMAILS || TRACKING_ADMIN_DEFAULT)
    .split(',').map(value => value.trim().toLowerCase()).filter(Boolean);
}
export function isTrackingAdmin(user) {
  return trackingAdmins().includes(String(user?.email || '').trim().toLowerCase());
}

async function createLocationSchema(sql) {
  await sql`CREATE TABLE IF NOT EXISTS e365_tracking_establishments (
    id TEXT PRIMARY KEY, owner_uid TEXT NOT NULL UNIQUE, owner_email TEXT NOT NULL,
    name TEXT NOT NULL, phone TEXT NOT NULL DEFAULT '', subscription_status TEXT NOT NULL DEFAULT 'pending',
    mp_preapproval_id TEXT UNIQUE, subscription_updated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
  await sql`CREATE TABLE IF NOT EXISTS e365_tracking_members (
    establishment_id TEXT NOT NULL REFERENCES e365_tracking_establishments(id) ON DELETE CASCADE,
    courier_uid TEXT, courier_email TEXT NOT NULL, display_name TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'invited', invited_by_uid TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), accepted_at TIMESTAMPTZ,
    PRIMARY KEY (establishment_id,courier_email)
  )`;
  await sql`CREATE INDEX IF NOT EXISTS e365_tracking_members_uid_idx ON e365_tracking_members(courier_uid)`;
  await sql`CREATE TABLE IF NOT EXISTS e365_tracking_routes (
    id TEXT PRIMARY KEY, establishment_id TEXT NOT NULL REFERENCES e365_tracking_establishments(id) ON DELETE CASCADE,
    created_by_uid TEXT NOT NULL, courier_email TEXT NOT NULL, destination_label TEXT NOT NULL,
    destination_address TEXT NOT NULL, latitude DOUBLE PRECISION, longitude DOUBLE PRECISION,
    notes TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'assigned', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
  await sql`CREATE INDEX IF NOT EXISTS e365_tracking_routes_establishment_idx ON e365_tracking_routes(establishment_id,created_at DESC)`;
  await sql`CREATE TABLE IF NOT EXISTS entrega365_courier_status (
    uid TEXT PRIMARY KEY, email TEXT NOT NULL DEFAULT '', display_name TEXT NOT NULL DEFAULT 'Motoboy',
    active BOOLEAN NOT NULL DEFAULT FALSE, started_at TIMESTAMPTZ, ended_at TIMESTAMPTZ, last_seen TIMESTAMPTZ,
    latitude DOUBLE PRECISION, longitude DOUBLE PRECISION, accuracy DOUBLE PRECISION, altitude DOUBLE PRECISION,
    speed DOUBLE PRECISION, heading DOUBLE PRECISION, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
  await sql`ALTER TABLE entrega365_courier_status ADD COLUMN IF NOT EXISTS establishment_id TEXT`;
  await sql`CREATE INDEX IF NOT EXISTS entrega365_courier_status_tenant_active_idx ON entrega365_courier_status(establishment_id,active,last_seen DESC)`;
  await sql`CREATE TABLE IF NOT EXISTS entrega365_location_points (
    id BIGSERIAL PRIMARY KEY, uid TEXT NOT NULL, email TEXT NOT NULL DEFAULT '', latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL, accuracy DOUBLE PRECISION, altitude DOUBLE PRECISION, speed DOUBLE PRECISION,
    heading DOUBLE PRECISION, recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
  await sql`ALTER TABLE entrega365_location_points ADD COLUMN IF NOT EXISTS establishment_id TEXT`;
  await sql`CREATE INDEX IF NOT EXISTS entrega365_location_points_uid_time_idx ON entrega365_location_points(uid,recorded_at DESC)`;
}
let locationSchemaPromise = null;
export function ensureLocationSchema(sql) {
  if (!locationSchemaPromise) locationSchemaPromise = createLocationSchema(sql).catch(error => { locationSchemaPromise = null; throw error; });
  return locationSchemaPromise;
}
export async function authenticated(req,res) {
  const user=await requireFirebaseUser(req);
  if(!user){unauthorized(res);return null;}
  return {...user,email:String(user.email||'').trim().toLowerCase()};
}
export function methodNotAllowed(res) {
  return res.status(405).json({ok:false,error:'method_not_allowed'});
}
export async function resolveTrackingAccess(sql,user) {
  const support=isTrackingAdmin(user);
  const owned=await sql`SELECT id,name,subscription_status FROM e365_tracking_establishments WHERE owner_uid=${user.uid} LIMIT 1`;
  const membership=await sql`SELECT establishment_id,display_name,status FROM e365_tracking_members WHERE courier_email=${String(user.email||'').toLowerCase()} AND status='accepted' ORDER BY accepted_at DESC LIMIT 1`;
  return {support,establishment:owned[0]||null,membership:membership[0]||null};
}
