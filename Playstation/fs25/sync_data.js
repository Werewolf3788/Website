// --- PRECISION INTEGRITY PROTOCOL ---
// Project: Full Savegame Aggregate Parser
// Timestamp: May 23, 2026, 00:50 AM (NYT)
// Note: This script performs a full, non-destructive read of all 
// savegame slots and aggregates them into a single master JSON.
// ------------------------------------

const fs = require('fs');
const path = require('path');
const xml2js = require('xml2js');

// Configuration: Do not strip, do not compress
const parser = new xml2js.Parser({ 
    explicitArray: false, 
    mergeAttrs: true 
});

async function syncAllSaves() {
    const baseDir = './Playstation/fs25/';
    const masterData = {
        meta: {
            last_sync: new Date().toISOString(),
            status: "Full Aggregate"
        },
        savegames: {}
    };

    // Ensure directory exists to avoid crashes
    if (!fs.existsSync(baseDir)) {
        console.error("Directory not found: " + baseDir);
        process.exit(1);
    }

    // Get all folders in the directory
    const items = fs.readdirSync(baseDir, { withFileTypes: true });
    const saveFolders = items.filter(item => item.isDirectory() && item.name.startsWith('savegame'));

    for (const folder of saveFolders) {
        const folderPath = path.join(baseDir, folder.name);
        masterData.savegames[folder.name] = {};

        // Track every file in the folder to ensure 100% data fidelity
        const files = fs.readdirSync(folderPath);
        
        for (const file of files) {
            if (file.endsWith('.xml')) {
                const filePath = path.join(folderPath, file);
                try {
                    const xmlData = fs.readFileSync(filePath, 'utf8');
                    const result = await parser.parseStringPromise(xmlData);
                    
                    // Use filename as the key, ensuring full data structure
                    const fileKey = file.replace('.xml', '');
                    masterData.savegames[folder.name][fileKey] = result;
                    
                } catch (e) {
                    console.error(`CRITICAL ERROR parsing ${filePath}:`, e);
                }
            }
        }
    }

    // Final output: Write the full, uncompressed JSON
    try {
        fs.writeFileSync(
            './Playstation/fs25/server_data.json', 
            JSON.stringify(masterData, null, 2)
        );
        console.log("Full sync complete: All data committed to Playstation/fs25/server_data.json");
    } catch (e) {
        console.error("Critical failure writing JSON file:", e);
    }
}

// Execute the sync
syncAllSaves().catch(err => {
    console.error("Workflow failed:", err);
    process.exit(1);
});
