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
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
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

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers });
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

    let nextPageToken;
    let totalDeleted = 0;

    do {
      const result = await getAuth().listUsers(1000, nextPageToken);

      const uids = result.users.filter((user) => user.uid !== decodedToken.uid).map((user) => user.uid);

      if (uids.length > 0) {
        const deleteResult = await getAuth().deleteUsers(uids);
        totalDeleted += deleteResult.successCount;

        if (deleteResult.failureCount > 0) {
          console.error("Some users could not be deleted:", deleteResult.errors);
        }
      }

      nextPageToken = result.pageToken;
    } while (nextPageToken);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Firebase Auth users cleared successfully",
        deletedCount: totalDeleted,
      }),
      { status: 200, headers },
    );
  } catch (error) {
    console.error("Clear auth users error:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      { status: 500, headers },
    );
  }
};
