import { getDb } from './db.js';
import { requireFirebaseUser, unauthorized } from './auth.js';

export const TRACKING_ADMIN_DEFAULT = 'entrega365.suporte@gmail.com';

export function trackingAdmins() {
  return (process.env.TRACKING_ADMIN_EMAILS || TRACKING_ADMIN_DEFAULT)
    .split(',')
    .map(value => value.trim().toLowerCase())
    .filter(Boolean);
}

export function isTrackingAdmin(user) {
  return trackingAdmins().includes(String(user?.email || '').toLowerCase());
}

async function createLocationSchema(sql) {
  await sql`CREATE TABLE IF NOT EXISTS entrega365_courier_status (
    uid TEXT PRIMARY KEY,
    email TEXT NOT NULL DEFAULT '',
    display_name TEXT NOT NULL DEFAULT 'Motoboy',
    active BOOLEAN NOT NULL DEFAULT FALSE,
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    last_seen TIMESTAMPTZ,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    accuracy DOUBLE PRECISION,
    altitude DOUBLE PRECISION,
    speed DOUBLE PRECISION,
    heading DOUBLE PRECISION,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
  await sql`CREATE INDEX IF NOT EXISTS entrega365_courier_status_active_idx ON entrega365_courier_status(active,last_seen DESC)`;
  await sql`CREATE TABLE IF NOT EXISTS entrega365_location_points (
    id BIGSERIAL PRIMARY KEY,
    uid TEXT NOT NULL,
    email TEXT NOT NULL DEFAULT '',
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    accuracy DOUBLE PRECISION,
    altitude DOUBLE PRECISION,
    speed DOUBLE PRECISION,
    heading DOUBLE PRECISION,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
  await sql`CREATE INDEX IF NOT EXISTS entrega365_location_points_uid_time_idx ON entrega365_location_points(uid,recorded_at DESC)`;
}

let locationSchemaPromise = null;
export function ensureLocationSchema(sql) {
  if (!locationSchemaPromise) {
    locationSchemaPromise = createLocationSchema(sql).catch(error => {
      locationSchemaPromise = null;
      throw error;
    });
  }
  return locationSchemaPromise;
}

export async function authenticated(req, res) {
  const user = await requireFirebaseUser(req);
  if (!user) {
    unauthorized(res);
    return null;
  }
  return user;
}

export function methodNotAllowed(res) {
  return res.status(405).json({ ok: false, error: 'method_not_allowed' });
}
