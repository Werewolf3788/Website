require('dotenv').config({ path: __dirname + '/.env' });
const Client = require('ftp');
const admin = require('firebase-admin');

console.log("Initializing Automated G-Portal Backup Engine...");

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

// 2. Link directly to your exact Firebase Realtime Database and Storage Bucket
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

// 3. Connect to G-Portal FTP and drop the file directly into Firebase Storage
ftpClient.on('ready', function() {
  console.log("FTP Uplink Established. Mirroring game data...");

  const remoteSavePath = '/farmingSim_2025/profile/savegame1.zip';
  const firebaseStorageDest = 'server_backups/savegame1.zip';

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
      console.log('Success! Savegame file mirrored to Firebase Storage.');
      
      // 4. Drop a timestamp update directly into your specific Firebase database node path (/fs25)
      try {
        await db.ref('fs25/lastAutomatedSync').set({
          timestamp: new Date().toISOString(),
          status: "Success",
          message: "16-Minute Automated Cloud Pull Complete"
        });
        console.log("Firebase Realtime Database node path updated successfully.");
      } catch (dbErr) {
        console.error("Failed to write node data update to Realtime Database:", dbErr);
      }

      ftpClient.end();
    });
  });
});

ftpClient.connect(ftpConfig);
