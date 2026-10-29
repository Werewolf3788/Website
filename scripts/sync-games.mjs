import fs from "fs";
import path from "path";
import admin from "firebase-admin";

// Section: Credentials & Initialization
// Line 7-18: Authenticate with Firebase Admin SDK using your GitHub Action secret
if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
  console.error("Missing GCP_SA_KEY_ENTERTAINMENT secret.");
  process.exit(1);
}

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: "entertainment-71888"
});

const db = admin.firestore();
const gamesDir = path.resolve(process.cwd(), "game/data/games");

// Helper: Normalize names into consistent Firestore document IDs (e.g., "Far Cry 5" -> "FarCry5")
function formatGameSlug(rawName) {
  return rawName
    .trim()
    .replace(/\s+/g, "")
    .replace(/[^a-zA-Z0-9_-]/g, "");
}

// Section: Sync Engine
// Line 34-87: Read JSON files and write to /games/{gameSlug}
async function syncGames() {
  if (!fs.existsSync(gamesDir)) {
    console.error(`Folder not found: ${gamesDir}`);
    process.exit(1);
  }

  const files = fs.readdirSync(gamesDir).filter(f => f.endsWith(".json"));
  console.log(`Processing ${files.length} JSON file(s)...`);

  for (const file of files) {
    if (file === "index.json") {
      console.log("Skipping index.json...");
      continue;
    }

    const filePath = path.join(gamesDir, file);
    try {
      const content = fs.readFileSync(filePath, "utf-8");
      const data = JSON.parse(content);

      // Determine human-readable document ID
      // Checks for: data.slug -> data.gameName -> data.name -> filename without extension
      const rawName = data.slug || data.gameName || data.name || path.basename(file, ".json");
      const gameSlug = formatGameSlug(rawName);

      if (!gameSlug) {
        console.warn(`[SKIP] Could not resolve a valid game slug for ${file}`);
        continue;
      }

      // Preserve PlayStation commId inside the document payload
      const commId = data.commId || data.npCommunicationId || (file.startsWith("NPWR") ? path.basename(file, ".json") : null);

      // Save document at /games/{gameSlug}
      const docRef = db.collection("games").doc(gameSlug);

      await docRef.set({
        gameSlug: gameSlug,
        commId: commId,
        sourceFile: file,
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        ...data
      });

      console.log(`[SYNCED] ${file} -> /games/${gameSlug}`);
    } catch (err) {
      console.error(`[ERROR] Failed to process ${file}:`, err.message);
    }
  }
}

// Section: Execution Wrapper
// Line 90-95: Run the sync and gracefully exit
syncGames().then(() => {
  console.log("Firestore game sync completed successfully.");
}).catch((err) => {
  console.error("Fatal sync error:", err);
  process.exit(1);
});
