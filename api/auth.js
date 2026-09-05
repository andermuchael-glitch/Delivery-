const FIREBASE_LOOKUP_URL = 'https://identitytoolkit.googleapis.com/v1/accounts:lookup';

// Firebase Web API keys are client identifiers, not server secrets. Keep the
// environment variable as the preferred value, but fall back to the same
// project key used by the frontend so Community/Marketplace do not become
// unusable when FIREBASE_API_KEY is missing from Vercel.
const FIREBASE_WEB_API_KEY = 'AIzaSyDaOy4D6Jr3LPTKEdkHC3OQjiv8_ZySPYU';

function getBearer(req) {
  const value = req.headers.authorization || '';
  return value.startsWith('Bearer ') ? value.slice(7).trim() : '';
}

export async function requireFirebaseUser(req) {
  const idToken = getBearer(req);
  const apiKey = process.env.FIREBASE_API_KEY || FIREBASE_WEB_API_KEY;

  if (!idToken) return null;

  try {
    const response = await fetch(`${FIREBASE_LOOKUP_URL}?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken })
    });

    if (!response.ok) return null;

    const data = await response.json();
    const firebaseUser = data?.users?.[0];
    if (!firebaseUser?.localId) return null;

    return {
      uid: firebaseUser.localId,
      email: firebaseUser.email || '',
      displayName: firebaseUser.displayName || ''
    };
  } catch (error) {
    console.error('Firebase token validation:', error);
    return null;
  }
}

export function unauthorized(res) {
  return res.status(401).json({ ok: false, error: 'Não autenticado' });
}
