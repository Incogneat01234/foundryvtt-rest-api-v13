const fs = require('fs');
const path = require('path');

// Check if archiver is installed
let archiver;
try {
  archiver = require('archiver');
} catch (e) {
  console.error('❌ Error: archiver package not found');
  console.log('Please run: npm install');
  process.exit(1);
}

console.log('📦 Creating Simple API module package...\n');

// Read module.json to get version
const moduleJson = JSON.parse(fs.readFileSync('./module.json', 'utf8'));
const version = moduleJson.version;
const moduleId = moduleJson.id;

// Create release directory
const releaseDir = './release';
if (!fs.existsSync(releaseDir)) {
  fs.mkdirSync(releaseDir);
}

// Copy module.json to release
fs.copyFileSync('./module.json', path.join(releaseDir, 'module.json'));
console.log('✓ Copied module.json');

// Create zip file
const outputPath = path.join(releaseDir, 'module.zip');
const output = fs.createWriteStream(outputPath);
const archive = archiver('zip', { zlib: { level: 9 } });

output.on('close', () => {
  console.log(`\n✅ Package created: ${outputPath}`);
  console.log(`   Size: ${(archive.pointer() / 1024).toFixed(2)} KB`);
  
  // Also create a versioned copy
  const versionedPath = path.join(releaseDir, `${moduleId}-v${version}.zip`);
  fs.copyFileSync(outputPath, versionedPath);
  console.log(`   Version copy: ${versionedPath}`);
});

archive.on('error', (err) => {
  throw err;
});

// Pipe archive data to file
archive.pipe(output);

// Add files (flat structure for direct extraction)
archive.file('./module.json', { name: 'module.json' });
archive.directory('./scripts/', 'scripts');

// Finalize
archive.finalize();