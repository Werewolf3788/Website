// data/woth2/scripts/compile-woth2.js
const fs = require('fs');
const path = require('path');

// When the script is in data/woth2/scripts, '..' points directly to data/woth2
const targetDir = path.join(__dirname, '..');
const outputFile = path.join(targetDir, 'game_data.json');

// Exclude output file and scripts directory
const ignoreFiles = ['game_data.json', 'scripts'];

const mergedData = {};

try {
  const files = fs.readdirSync(targetDir)
    .filter(file => file.endsWith('.json') && !ignoreFiles.includes(file));

  files.forEach(file => {
    const filePath = path.join(targetDir, file);
    const content = fs.readFileSync(filePath, 'utf8').trim();

    if (!content) return;

    const parsed = JSON.parse(content);
    const key = path.basename(file, '.json');

    mergedData[key] = parsed;
  });

  fs.writeFileSync(outputFile, JSON.stringify(mergedData, null, 2), 'utf8');
  console.log(`Successfully merged ${files.length} modules into ${outputFile}`);
} catch (err) {
  console.error('Compilation failed:', err);
  process.exit(1);
}
