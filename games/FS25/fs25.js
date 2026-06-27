require('dotenv').config({ path: __dirname + '/.env' });
const Client = require('ftp');
const admin = require('firebase-admin');

// 🚨 GLOBAL RUNTIME SECURITY TIMEOUT
// Prevents any hidden asynchronous or unclosed socket connections from hanging the GitHub runner.
setTimeout(() => {
  console.log("🚨 Safety Failsafe triggered: Script execution exceeded 5 minutes. Forcing secure exit.");
  process.exit(0);
}, 5 * 60 * 1000);

console.log("Initializing Universal Nuclear Scraper Engine (All-XML Dynamic Slot)...");

// 1. Firebase Administration Setup
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

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://game-tracker-5b2ef-default-rtdb.firebaseio.com"
});

const db = admin.database();
const ftpClient = new Client();

const ftpConfig = {
  host: process.env.FTP_HOST || '207.244.243.68',
  port: parseInt(process.env.FTP_PORT) || 50441,
  user: process.env.FTP_USER,
  password: process.env.FTP_PASS
};

const STATS_URL = "http://207.244.243.68:8500/feed/dedicated-server-stats.xml?code=jeRZKn2jNdgJNqqs";

// Helper function to extract a fast value out of an XML string block
function getTagValue(xmlString, tagName) {
  const match = xmlString.match(new RegExp(`<${tagName}>(.*?)</${tagName}>`));
  return match ? match[1].trim() : null;
}

// Light XML parser to turn files into ultra-clean nested JSON nodes for Firebase trees
function xmlToJsonSimple(xmlString) {
  const obj = {};
  
  // 1. Map tags with direct inline attributes: <element price="500" />
  const selfClosingRegex = /<(\w+)\s+([^>]*)\/>/g;
  let match;
  while ((match = selfClosingRegex.exec(xmlString)) !== null) {
    const tagName = match[1];
    const attrsText = match[2];
    const attrs = {};
    
    const attrRegex = /(\w+)="([^"]*)"/g;
    let attrMatch;
    while ((attrMatch = attrRegex.exec(attrsText)) !== null) {
      const safeKey = attrMatch[1].replace(/[\.\#\$\/\[\]]/g, '_');
      attrs[safeKey] = isNaN(attrMatch[2]) ? attrMatch[2] : parseFloat(attrMatch[2]);
    }
    
    if (!obj[tagName]) obj[tagName] = [];
    obj[tagName].push(attrs);
  }

  // 2. Map standard text open/closes: <money>150000</money>
  const valueRegex = /<(\w+)>([^<]+)<\/\1>/g;
  while ((match = valueRegex.exec(xmlString)) !== null) {
    const safeKey = match[1].replace(/[\.\#\$\/\[\]]/g, '_');
    const val = match[2].trim();
    obj[safeKey] = isNaN(val) ? val : parseFloat(val);
  }

  return obj;
}

// Promise wrapper to pull clean file text content from live streams
function downloadFileBuffer(client, remotePath) {
  return new Promise((resolve, reject) => {
    client.get(remotePath, (err, stream) => {
      if (err) return reject(err);
      let data = '';
      stream.on('data', chunk => data += chunk);
      stream.on('end', () => resolve(data));
      stream.on('error', streamErr => reject(streamErr));
    });
  });
}

async function runMainPipeline() {
  let activePlayers = 0;
  
  // A. Check live players via Web API
  try {
    const response = await fetch(STATS_URL);
    if (response.ok) {
      const statsXml = await response.text();
      const slotsMatch = statsXml.match(/slots\s+numUsed="(\d+)"/);
      if (slotsMatch) activePlayers = parseInt(slotsMatch[1]);
    }
  } catch (err) {
    console.log("⚠️ API down, continuing directly with structural file analysis.");
  }

  console.log(`Live Player Count: ${activePlayers}`);

  // B. Enforce the 6-hour cooldown engine rule if the server runtime is idle
  if (activePlayers === 0) {
    try {
      const snapshot = await db.ref('fs25/liveState/lastUpdated').get();
      if (snapshot.exists()) {
        const lastUpdateStr = snapshot.val();
        const hoursSinceLastUpdate = (new Date() - new Date(lastUpdateStr)) / (1000 * 60 * 60);
        
        if (hoursSinceLastUpdate < 6) {
          console.log(`🛑 Server is completely empty. Last update was only ${hoursSinceLastUpdate.toFixed(2)} hours ago. Safe exit.`);
          process.exit(0);
        }
      }
    } catch (dbE) {
      console.log("No previous timing footprint found. Forcing structural sweep.");
    }
  }

  // C. Fire up the FTP pipeline
  ftpClient.on('ready', function() {
    console.log("FTP Uplink Ready. Detecting active savegame index...");

    // FIXED: Removed leading slash to prevent 550 errors on chrooted game servers
    ftpClient.get('dedicatedServerConfig.xml', function(err, configStream) {
      if (err) {
        console.error("⚠️ Couldn't read dedicatedServerConfig.xml relative to base directory. Trying fallback safe Slot 8.", err.message);
        processActiveFolderSync(8, activePlayers);
        return;
      }

      let configData = '';
      configStream.on('data', chunk => configData += chunk);
      configStream.on('end', () => {
        let detectedSlot = getTagValue(configData, 'savegame_index');
        
        if (!detectedSlot) {
          console.log("⚠️ Could not scrape <savegame_index>. Defaulting to fallback Slot 8.");
          detectedSlot = 8;
        } else {
          console.log(`🎯 Server configuration scan successful. Active Map is in Slot [ ${detectedSlot} ]`);
        }

        processActiveFolderSync(parseInt(detectedSlot), activePlayers);
      });
    });
  });

  // Handle connection errors gracefully without leaving the runner stuck
  ftpClient.on('error', function(err) {
    console.error("🚨 FTP Client Error Interface Failure:", err.message);
    try { ftpClient.end(); } catch(e) {}
    process.exit(1);
  });

  ftpClient.connect(ftpConfig);
}

function processActiveFolderSync(slotNumber, activePlayers) {
  // FIXED: Converted paths to relative target trees without front slash bounds
  const targetFolderPath = `savegame${slotNumber}`;
  console.log(`Scanning target folder directory: ${targetFolderPath}`);

  ftpClient.list(targetFolderPath, async function(err, list) {
    if (err) {
      console.error(`❌ Failed tracking layout contents of directory: ${targetFolderPath}`, err.message);
      ftpClient.end();
      process.exit(0); // Safely exit without hanging the environment pipeline
      return;
    }

    // Isolate absolutely every single active configuration file ending in .xml
    const xmlFiles = list.filter(f => f.type !== 'd' && f.name.toLowerCase().endsWith('.xml'));
    console.log(`📂 Found ${xmlFiles.length} map configuration files inside Savegame ${slotNumber}. Initiating transmission...`);

    const masterPayload = {
      activePlayers: activePlayers,
      activeSaveSlot: slotNumber,
      lastUpdated: new Date().toISOString()
    };

    // Dynamically iterate over every file found in the directory tree
    for (const fileInfo of xmlFiles) {
      const fileNameClean = fileInfo.name.replace('.xml', '').replace(/[\.\#\$\/\[\]]/g, '_');
      const remoteFilePath = `${targetFolderPath}/${fileInfo.name}`;
      
      try {
        console.log(`Extracting tree payload leaf: ${fileInfo.name}`);
        const rawXmlContent = await downloadFileBuffer(ftpClient, remoteFilePath);
        masterPayload[fileNameClean] = xmlToJsonSimple(rawXmlContent);
      } catch (fileErr) {
        console.error(`❌ Data scrape sequence bypassed on object element: ${fileInfo.name}`, fileErr.message);
      }
    }

    // D. Synchronize master payload tree to Firebase Realtime Database
    try {
      await db.ref('fs25/liveState').set(masterPayload);
      console.log(`🏆 Tactical Command Center synchronized! All files from Slot ${slotNumber} pushed safely to Firebase.`);
    } catch (writeErr) {
      console.error("Master state transmission update rejected by database:", writeErr.message);
    }

    console.log("🔌 Closing FTP Socket Stream.");
    ftpClient.end();
    process.exit(0);
  });
}

runMainPipeline();
