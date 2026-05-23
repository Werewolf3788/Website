const fs = require('fs');
const path = require('path');
const xml2js = require('xml2js');

const parser = new xml2js.Parser({ explicitArray: false, mergeAttrs: true });

async function syncAllSaves() {
    const baseDir = './Playstation/fs25/';
    const masterData = { meta: { last_sync: new Date().toISOString() }, savegames: {} };
    if (!fs.existsSync(baseDir)) process.exit(1);

    const saveFolders = fs.readdirSync(baseDir, { withFileTypes: true })
                          .filter(item => item.isDirectory() && item.name.startsWith('savegame'));

    for (const folder of saveFolders) {
        const folderPath = path.join(baseDir, folder.name);
        masterData.savegames[folder.name] = {};
        for (const file of fs.readdirSync(folderPath)) {
            if (file.endsWith('.xml')) {
                const xmlData = fs.readFileSync(path.join(folderPath, file), 'utf8');
                const result = await parser.parseStringPromise(xmlData);
                masterData.savegames[folder.name][file.replace('.xml', '')] = result;
            }
        }
    }
    fs.writeFileSync('./Playstation/fs25/server_data.json', JSON.stringify(masterData, null, 2));
}
syncAllSaves();
