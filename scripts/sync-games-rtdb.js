// Section 1: Line 1 - Environment & Configuration
const fs = require('fs');
const path = require('path');

const apiKey = process.env.FIREBASE_ENTERTAINEMENT_API;
if (!apiKey) {
  console.error("Missing FIREBASE_ENTERTAINEMENT_API environment variable.");
  process.exit(1);
}

const RTDB_BASE = "https://entertainment-71888-default-rtdb.firebaseio.com";
const rootDir = process.cwd();

// Section 2: Line 14 - Directory Targeting for public/games
const candidatePaths = [
  path.join(rootDir, 'public/games'),
  path.join(rootDir, 'website/public/games'),
  path.join(__dirname, '../public/games'),
  path.join(__dirname, '../website/public/games')
];

let targetDir = null;
for (const p of candidatePaths) {
  if (fs.existsSync(p)) {
    targetDir = p;
    break;
  }
}

if (!targetDir) {
  console.error("Could not find public/games directory in candidate paths:", candidatePaths);
  process.exit(1);
}

console.log(`Discovered active game directory: ${targetDir}`);

// Section 3: Line 38 - Upload Loop via Firebase RTDB REST API
async function pushGamesToRTDB() {
  const files = fs.readdirSync(targetDir);
  const jsonFiles = files.filter(file => file.endsWith('.json'));

  if (jsonFiles.length === 0) {
    console.log("No .json files found in public/games directory.");
    process.exit(0);
  }

  console.log(`Found ${jsonFiles.length} game JSON file(s). Syncing to /games/...`);

  const validKeys = new Set();

  for (const file of jsonFiles) {
    const filePath = path.join(targetDir, file);
    // Sanitize game key: farcry5.json -> farcry5
    const gameKey = path.basename(file, '.json').replace(/[.#$\[\]\/]/g, '_');
    validKeys.add(gameKey);

    try {
      const fileData = fs.readFileSync(filePath, 'utf8');
      JSON.parse(fileData); // Syntax check

      const targetUrl = `${RTDB_BASE}/games/${gameKey}.json?auth=${apiKey}`;
      console.log(`Uploading [${file}] to /games/${gameKey}...`);

      const response = await fetch(targetUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: fileData
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`HTTP ${response.status} failed for ${file}:`, errorText);
      } else {
        console.log(`Successfully synced: /games/${gameKey}`);
      }
    } catch (err) {
      console.error(`Error processing file ${file}:`, err.message);
    }
  }

  // Remove any /games/{key} left over from a renamed or deleted file (e.g. WOTH2 -> woth2
  // left the old uppercase key behind forever, since this script only ever PUTs current
  // files and never looked at what was already there). Without this, a rename shows up as
  // a duplicate game pill on the site instead of replacing the old entry.
  try {
    const listRes = await fetch(`${RTDB_BASE}/games.json?shallow=true&auth=${apiKey}`);
    if (listRes.ok) {
      const existingKeys = await listRes.json();
      const orphans = Object.keys(existingKeys || {}).filter((k) => !validKeys.has(k));
      for (const key of orphans) {
        const delUrl = `${RTDB_BASE}/games/${key}.json?auth=${apiKey}`;
        const delRes = await fetch(delUrl, { method: 'DELETE' });
        if (delRes.ok) console.log(`Removed orphaned /games/${key} (no matching file in public/games).`);
        else console.error(`Failed to remove orphaned /games/${key}: HTTP ${delRes.status}`);
      }
      if (!orphans.length) console.log("No orphaned /games keys to remove.");
    } else {
      console.error(`Could not list /games for orphan cleanup: HTTP ${listRes.status}`);
    }
  } catch (err) {
    console.error("Error during orphaned-key cleanup:", err.message);
  }

  console.log("Finished syncing game files to RTDB.");
  process.exit(0);
}

pushGamesToRTDB().catch(err => {
  console.error("Fatal error during sync process:", err);
  process.exit(1);
});
