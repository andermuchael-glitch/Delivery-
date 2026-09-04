const FIREBASE_LOOKUP_URL = 'https://identitytoolkit.googleapis.com/v1/accounts:lookup';

function getBearer(req) {
  const value = req.headers.authorization || '';
  return value.startsWith('Bearer ') ? value.slice(7).trim() : '';
}

export async function requireFirebaseUser(req) {
  const idToken = getBearer(req);
  const apiKey = process.env.FIREBASE_API_KEY;

  if (!idToken || !apiKey) return null;

  const response = await fetch(`${FIREBASE_LOOKUP_URL}?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken })
  });

  if (!response.ok) return null;

  const data = await response.json();
  const user = data?.users?.[0];
  if (!user?.localId) return null;

  return {
    uid: user.localId,
    email: user.email || '',
    displayName: user.displayName || ''
  };
}

export function unauthorized(res) {
  return res.status(401).json({ ok: false, error: 'Não autenticado' });
}
