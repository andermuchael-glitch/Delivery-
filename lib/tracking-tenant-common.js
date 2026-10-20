import { getDb } from './db.js';
import { requireFirebaseUser, unauthorized } from './auth.js';

export async function tenantAuth(req, res) {
  const user = await requireFirebaseUser(req);
  if (!user) { unauthorized(res); return null; }
  if (!user.email) { res.status(403).json({ ok:false, error:'google_email_required' }); return null; }
  return { ...user, email: String(user.email).trim().toLowerCase() };
}

export async function ensureTenantSchema(sql) {
  await sql`CREATE TABLE IF NOT EXISTS e365_tracking_establishments (
    id TEXT PRIMARY KEY,
    owner_uid TEXT NOT NULL UNIQUE,
    owner_email TEXT NOT NULL,
    name TEXT NOT NULL,
    phone TEXT NOT NULL DEFAULT '',
    subscription_status TEXT NOT NULL DEFAULT 'pending',
    mp_preapproval_id TEXT UNIQUE,
    subscription_updated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
  await sql`CREATE TABLE IF NOT EXISTS e365_tracking_members (
    establishment_id TEXT NOT NULL REFERENCES e365_tracking_establishments(id) ON DELETE CASCADE,
    courier_uid TEXT,
    courier_email TEXT NOT NULL,
    display_name TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'invited',
    invited_by_uid TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    accepted_at TIMESTAMPTZ,
    PRIMARY KEY (establishment_id,courier_email)
  )`;
  await sql`CREATE INDEX IF NOT EXISTS e365_tracking_members_uid_idx ON e365_tracking_members(courier_uid)`;
  await sql`CREATE TABLE IF NOT EXISTS e365_tracking_routes (
    id TEXT PRIMARY KEY,
    establishment_id TEXT NOT NULL REFERENCES e365_tracking_establishments(id) ON DELETE CASCADE,
    created_by_uid TEXT NOT NULL,
    courier_email TEXT NOT NULL,
    destination_label TEXT NOT NULL,
    destination_address TEXT NOT NULL,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    notes TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'assigned',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
  await sql`CREATE INDEX IF NOT EXISTS e365_tracking_routes_establishment_idx ON e365_tracking_routes(establishment_id,created_at DESC)`;
}

export async function getEstablishmentForOwner(sql, user) {
  const rows = await sql`SELECT * FROM e365_tracking_establishments WHERE owner_uid=${user.uid} LIMIT 1`;
  return rows[0] || null;
}

export function isSupport(user) {
  const allowed = (process.env.TRACKING_ADMIN_EMAILS || 'andermuchael@gmail.com')
    .split(',').map(v => v.trim().toLowerCase()).filter(Boolean);
  return allowed.includes(String(user?.email || '').trim().toLowerCase());
}

export function methodNotAllowed(res) {
  return res.status(405).json({ ok:false, error:'method_not_allowed' });
}
