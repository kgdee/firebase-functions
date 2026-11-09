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
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

export default async (req, context) => {
  const url = new URL(req.url);
  const secret = url.searchParams.get("secret");
  const uid = url.searchParams.get("uid");

  // Security Check: Verify secret token
  if (!secret || secret !== process.env.ADMIN_SETUP_SECRET) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers });
  }

  // Validate UID presence
  if (!uid) {
    return new Response(JSON.stringify({ error: "Missing 'uid' query parameter" }), { status: 400, headers });
  }

  try {
    // Set custom user claims
    await getAuth().setCustomUserClaims(uid, { role: "admin" });

    return new Response(
      JSON.stringify({
        success: true,
        message: `User ${uid} successfully upgraded to admin!`,
      }),
      { status: 200, headers },
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers });
  }
};
