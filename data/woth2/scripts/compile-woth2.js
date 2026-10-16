// ============================================================================
// File: data/woth2/scripts/compile-woth2.js
// Purpose: Automatically compile modular JSON files into data/woth2/game_data.json
// Runtime: Node.js (Standard built-in modules only: fs, path)
// ============================================================================

const fs = require('fs');
const path = require('path');

// Target directory containing the modular JSON files
const targetDir = path.join(__dirname, '..');
const outputFile = path.join(targetDir, 'game_data.json');

// Files or directories to ignore during merge
const ignoreList = ['game_data.json', 'scripts'];

// Primary data container
const mergedData = {};

function compileData() {
  console.log(`[Compile WotH2] Scanning directory: ${targetDir}`);

  if (!fs.existsSync(targetDir)) {
    console.error(`[Compile WotH2] Target directory not found: ${targetDir}`);
    process.exit(1);
  }

  // Read all .json files excluding the output file and ignored names
  const files = fs.readdirSync(targetDir).filter(file => {
    return file.endsWith('.json') && !ignoreList.includes(file);
  });

  if (files.length === 0) {
    console.warn('[Compile WotH2] No JSON source files found to merge.');
    process.exit(0);
  }

  console.log(`[Compile WotH2] Found ${files.length} JSON module(s) to process.`);

  let mergedCount = 0;

  files.forEach(file => {
    const filePath = path.join(targetDir, file);

    try {
      const rawContent = fs.readFileSync(filePath, 'utf8').trim();

      // Guard against blank files
      if (!rawContent) {
        console.warn(`[Compile WotH2] Skipping empty file: ${file}`);
        return;
      }

      const parsed = JSON.parse(rawContent);

      // Merge top-level keys directly into mergedData
      Object.assign(mergedData, parsed);
      mergedCount++;
      console.log(`[Compile WotH2] Merged: ${file}`);
    } catch (parseErr) {
      console.error(`[Compile WotH2] ERROR parsing JSON in ${file}:`, parseErr.message);
      process.exit(1);
    }
  });

  // Write finalized game_data.json with standard 2-space indentation
  try {
    const serializedData = JSON.stringify(mergedData, null, 2);
    fs.writeFileSync(outputFile, serializedData, 'utf8');
    console.log(`[Compile WotH2] SUCCESS: Compiled ${mergedCount} modules into ${outputFile}`);
  } catch (writeErr) {
    console.error('[Compile WotH2] ERROR writing game_data.json:', writeErr.message);
    process.exit(1);
  }
}

compileData();
