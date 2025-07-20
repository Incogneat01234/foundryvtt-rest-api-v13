const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

// Create dist directory if it doesn't exist
if (!fs.existsSync('dist')) {
    console.error('Error: dist directory not found. Please run "npm run build" first.');
    process.exit(1);
}

// Create release directory
const releaseDir = './release';
if (!fs.existsSync(releaseDir)) {
    fs.mkdirSync(releaseDir);
}

// Read module.json to get version
const moduleJson = JSON.parse(fs.readFileSync('./src/module.json', 'utf8'));
const version = moduleJson.version;
const moduleId = moduleJson.id;

// Create a file to stream archive data to
const outputPath = path.join(releaseDir, `${moduleId}-v${version}.zip`);
const output = fs.createWriteStream(outputPath);
const archive = archiver('zip', {
    zlib: { level: 9 } // Maximum compression
});

// Listen for all archive data to be written
output.on('close', function() {
    console.log(`✓ Module package created: ${outputPath}`);
    console.log(`  Size: ${(archive.pointer() / 1024 / 1024).toFixed(2)} MB`);
    console.log('\nTo install:');
    console.log('1. Open Foundry VTT');
    console.log('2. Go to Settings → Manage Modules → Install Module');
    console.log('3. Click "Browse" and select this file:');
    console.log(`   ${path.resolve(outputPath)}`);
});

// Good practice to catch warnings
archive.on('warning', function(err) {
    if (err.code === 'ENOENT') {
        console.warn('Warning:', err);
    } else {
        throw err;
    }
});

// Good practice to catch this error explicitly
archive.on('error', function(err) {
    throw err;
});

// Pipe archive data to the file
archive.pipe(output);

// Add files to the archive
console.log('Building module package...');

// Add module.json
archive.file('./src/module.json', { name: 'module.json' });

// Add languages
archive.directory('./src/languages/', 'languages');

// Add compiled scripts
if (fs.existsSync('./dist/scripts')) {
    archive.directory('./dist/scripts/', 'scripts');
} else if (fs.existsSync('./dist')) {
    // Fallback if scripts are directly in dist
    archive.glob('**/*.js', { cwd: './dist' }, { prefix: 'scripts/' });
}

// Add styles if they exist
if (fs.existsSync('./dist/styles')) {
    archive.directory('./dist/styles/', 'styles');
}

// Finalize the archive
archive.finalize();