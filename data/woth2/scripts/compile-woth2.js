// scripts/compile-woth2.js
const fs = require('fs');
const path = require('path');

// Target directory containing your modular files
const targetDir = path.join(__dirname, '../data/woth2');
const outputFile = path.join(targetDir, 'game_data.json');

// Files to exclude from merging into game_data.json
const ignoreFiles = ['game_data.json'];

const mergedData = {};

try {
  const files = fs.readdirSync(targetDir)
    .filter(file => file.endsWith('.json') && !ignoreFiles.includes(file));

  files.forEach(file => {
    const filePath = path.join(targetDir, file);
    const content = fs.readFileSync(filePath, 'utf8').trim();

    if (!content) return; // Skip empty files

    const parsed = JSON.parse(content);
    const key = path.basename(file, '.json');

    // Mounts data under the filename key (e.g. data.gear, data.species, data.dog_skills)
    mergedData[key] = parsed;
  });

  fs.writeFileSync(outputFile, JSON.stringify(mergedData, null, 2), 'utf8');
  console.log(`Successfully merged ${files.length} modules into ${outputFile}`);
} catch (err) {
  console.error('Compilation failed:', err);
  process.exit(1);
}
