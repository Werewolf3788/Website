require('dotenv').config({ path: __dirname + '/.env' });
const Client = require('ftp');
const admin = require('firebase-admin');

console.log("Initializing Automated Smart G-Portal Backup Engine...");

// 1. Pull the Firebase Key out of your GitHub Secrets Vault
let serviceAccount;
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
} else {
  try {
    serviceAccount = require("./your-firebase-adminsdk-key.json");
  } catch (e) {
    console.error("Missing FIREBASE_SERVICE_ACCOUNT secret.");
    process.exit(1);
  }
}

// 2. Link directly to your Firebase Realtime Database and Storage Bucket
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://game-tracker-5b2ef-default-rtdb.firebaseio.com",
  storageBucket: "game-tracker-5b2ef.firebasestorage.app"
});

const db = admin.database();
const bucket = admin.storage().bucket();
const ftpClient = new Client();

const ftpConfig = {
  host: process.env.FTP_HOST || '207.244.243.68',
  port: parseInt(process.env.FTP_PORT) || 50441,
  user: process.env.FTP_USER,
  password: process.env.FTP_PASS
};

// Helper function to extract text values between xml tags without requiring full DOM parser libraries
function getTagValue(xmlString, tagName) {
  const match = xmlString.match(new RegExp(`<${tagName}>(.*?)</${tagName}>`));
  return match ? match[1].trim() : null;
}

ftpClient.on('ready', function() {
  console.log("FTP Uplink Established. Checking server configuration for active save slot...");

  // Path to G-Portal's dedicated server configurations file
  const configPath = '/dedicatedServerConfig.xml';

  ftpClient.get(configPath, function(err, configStream) {
    if (err) {
      console.error("🚨 CRITICAL: Could not read dedicatedServerConfig.xml to detect active save slot. Defaulting to slot 1.", err);
      runFileMirrorSync(1); // Default safety fallback
      return;
    }

    let configData = '';
    configStream.on('data', (chunk) => { configData += chunk; });
    configStream.on('end', () => {
      // Find the active savegame index tag <savegameIndex>X</savegameIndex>
      let slotIndex = getTagValue(configData, 'savegameIndex');
      
      if (!slotIndex) {
        console.log("⚠️ Could not locate <savegameIndex> variable. Defaulting to slot 1.");
        slotIndex = 1;
      } else {
        console.log(`🎯 Active server save slot detected: Slot [ ${slotIndex} ]`);
      }

      runFileMirrorSync(slotIndex);
    });
  });
});

// 3. Dynamic Mirror Sync Operation
function runFileMirrorSync(slotNumber) {
  const remoteSavePath = `/farmingSim_2025/profile/savegame${slotNumber}.zip`;
  const firebaseStorageDest = `server_backups/savegame${slotNumber}.zip`;

  console.log(`Fetching active target: ${remoteSavePath}`);

  ftpClient.get(remoteSavePath, function(err, stream) {
    if (err) {
      console.error(`Target save missing on host: ${remoteSavePath}`, err);
      ftpClient.end();
      return;
    }

    const file = bucket.file(firebaseStorageDest);
    stream.pipe(file.createWriteStream({ metadata: { contentType: 'application/zip' } }))
    .on('error', (uploadErr) => {
      console.error('Cloud pipe failed:', uploadErr);
      ftpClient.end();
    })
    .on('finish', async () => {
      console.log(`Success! Savegame ${slotNumber} file mirrored to Firebase Storage.`);
      
      // 4. Update the live sync log node tree block path (/fs25)
      try {
        await db.ref('fs25/lastAutomatedSync').set({
          timestamp: new Date().toISOString(),
          status: "Success",
          activeSaveSlot: parseInt(slotNumber),
          message: `Slot ${slotNumber} Automated Cloud Mirror Complete`
        });
        console.log("Firebase Realtime Database state node refreshed successfully.");
      } catch (dbErr) {
        console.error("Failed to write state node updates to Realtime Database:", dbErr);
      }

      ftpClient.end();
    });
  });
}

ftpClient.connect(ftpConfig);
