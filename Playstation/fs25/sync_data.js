// New York Time: 2026-05-23 01:15:00
const fs = require('fs');
const xml2js = require('xml2js');

const parser = new xml2js.Parser({ explicitArray: false });

// Read the file downloaded by lftp
const xmlData = fs.readFileSync('./Playstation/fs25/gameserver.xml', 'utf8');

parser.parseString(xmlData, (err, result) => {
  if (err) {
    console.error("Error parsing XML:", err);
    process.exit(1);
  }
  
  // Write the JSON to your specified folder
  fs.writeFileSync('./Playstation/fs25/server_data.json', JSON.stringify(result, null, 2));
  console.log("server_data.json updated in Playstation/fs25/");
});
