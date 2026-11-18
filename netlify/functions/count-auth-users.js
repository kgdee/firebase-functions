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
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

export default async (req, context) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers,
    });
  }

  if (req.method !== "GET") {
    return Response.json({ error: "Method not allowed" }, { status: 405, headers });
  }

  try {
    let totalUsers = 0;
    let nextPageToken;

    do {
      const result = await getAuth().listUsers(1000, nextPageToken);

      totalUsers += result.users.length;
      nextPageToken = result.pageToken;
    } while (nextPageToken);

    return Response.json(
      {
        success: true,
        totalUsers,
      },
      {
        status: 200,
        headers,
      },
    );
  } catch (error) {
    console.error("Firebase Auth error:", error);

    return Response.json(
      {
        success: false,
        error: "Failed to retrieve user count",
      },
      {
        status: 500,
        headers,
      },
    );
  }
};
