const { initializeApp, cert } = require("firebase-admin/app");
const { getDatabase } = require("firebase-admin/database");
const { getFirestore } = require("firebase-admin/firestore");

(async () => {
  const raw = (process.env.FIREBASE_SERVICE_RAY || "").trim();
  if (!raw) { console.error("FIREBASE_SERVICE_RAY is empty or not passed to this step"); process.exit(1); }
  const creds = JSON.parse(raw);
  creds.private_key = creds.private_key.replace(/\\n/g, "\n");
  const app = initializeApp({
    credential: cert(creds),
    databaseURL: "https://playstation-stats-default-rtdb.firebaseio.com"
  });
  await getDatabase(app).ref("psn/connectionTest").set({ ok: true, at: new Date().toISOString() });
  await getFirestore(app).collection("meta").doc("connectionTest").set({ ok: true });
  console.log("RTDB + Firestore write OK");
})().catch(e => { console.error("FAILED:", e.message); process.exit(1); });
