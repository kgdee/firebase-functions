import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

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

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

export default async (req, context) => {
  if (req.method === "OPTIONS") {
    return new Response("", { status: 200, headers });
  }

  try {
    const url = new URL(req.url);
    const documentPath = url.searchParams.get("path");

    if (!documentPath) {
      return new Response(JSON.stringify({ error: "Missing document path" }), { status: 400, headers });
    }

    const docRef = db.doc(documentPath);
    const collectionRefs = await docRef.listCollections();
    const collections = collectionRefs.map((col) => ({
      id: col.id,
      path: col.path,
      parentPath: col.parent.path,
    }));

    return new Response(JSON.stringify({ collections: collections }), { status: 200, headers });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
  }
};
