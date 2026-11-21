import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

// Initialize Firebase Admin v13 singleton
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // Handle escaped newlines from Netlify env vars
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

// Wildcard CORS headers to allow requests from any domain
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export default async (req, context) => {
  // Handle CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: headers });
  }

  if (req.method !== 'POST') {
    return Response.json(
      { error: 'Method not allowed' },
      { status: 405, headers: headers }
    );
  }

  try {
    // Extract Bearer ID Token from Authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return Response.json(
        { error: 'Missing or invalid Authorization header' },
        { status: 401, headers: headers }
      );
    }

    const idToken = authHeader.split('Bearer ')[1];
    const auth = getAuth();

    // Verify the user's current session token
    const decodedToken = await auth.verifyIdToken(idToken);

    // Mint a Firebase Custom Token (valid for 1 hour)
    const customToken = await auth.createCustomToken(decodedToken.uid);

    return Response.json(
      { customToken },
      { status: 200, headers: headers }
    );
  } catch (error) {
    console.error('SSO Token Exchange Error:', error);
    return Response.json(
      { error: 'Unauthorized or invalid token' },
      { status: 401, headers: headers }
    );
  }
};
