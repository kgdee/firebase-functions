import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

// Initialize Firebase Admin
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

export default async (req, context) => {
  // Handle browser preflight CORS requests
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  // Enforce POST method
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), { status: 405, headers });
  }

  try {
    // Verify requester's authorization token
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized: Missing token" }), { status: 401, headers });
    }

    const token = authHeader.split("Bearer ")[1];
    const decodedToken = await getAuth().verifyIdToken(token);

    // Security Check: Ensure the requester is an admin
    if (decodedToken.role !== "admin") {
      return new Response(JSON.stringify({ error: "Forbidden: Admins only" }), { status: 403, headers });
    }

    // Parse URL parameters using snake_case
    const url = new URL(req.url);
    const targetUid = url.searchParams.get("target_uid");
    const newRole = url.searchParams.get("new_role");

    if (!targetUid || !newRole) {
      return new Response(JSON.stringify({ error: "Missing target_uid or new_role query parameters" }), { status: 400, headers });
    }

    // Assign Custom Claim
    await getAuth().setCustomUserClaims(targetUid, { role: newRole });

    return new Response(JSON.stringify({ success: true, message: `Successfully assigned role '${newRole}' to user.` }), { status: 200, headers });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers });
  }
};