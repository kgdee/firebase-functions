import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
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

const db = getFirestore();
const auth = getAuth();

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Content-Type": "application/json",
};

export default async (req, context) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: headers });
  }

  try {
    // Extract and verify the Authorization header
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized: Missing or invalid token." }), { status: 401, headers: headers });
    }

    const token = authHeader.split("Bearer ")[1];
    const decodedToken = await auth.verifyIdToken(token);

    // Check if the user has the admin role
    if (decodedToken.role !== "admin") {
      return new Response(JSON.stringify({ error: "Forbidden: Admin access required." }), { status: 403, headers: headers });
    }

    // Extract path from URL query parameters
    const url = new URL(req.url);
    const path = url.searchParams.get("path");

    if (!path) {
      return new Response(JSON.stringify({ error: 'Missing "path" query parameter.' }), { status: 400, headers: headers });
    }

    // Determine if the path maps to a Document or a Collection
    const segments = path.split("/").filter(Boolean);
    if (segments.length === 0) {
      return new Response(JSON.stringify({ error: "Invalid path provided." }), { status: 400, headers: headers });
    }

    const ref = segments.length % 2 === 0 ? db.doc(path) : db.collection(path);

    // Execute built-in recursive delete
    await db.recursiveDelete(ref);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Item "${path}" recursive deleted successfully.`,
      }),
      { status: 200, headers: headers },
    );
  } catch (error) {
    console.error("Recursive delete error:", error);
    return new Response(JSON.stringify({ error: error.message || "Internal Server Error" }), { status: 500, headers: headers });
  }
};
