#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Read current version from module.json
const moduleJson = JSON.parse(fs.readFileSync('./src/module.json', 'utf8'));
const version = moduleJson.version;

console.log(`Creating release for version ${version}...`);

try {
  // Build the module
  console.log('Building module...');
  execSync('npm run build', { stdio: 'inherit', env: { ...process.env, CI: 'true' } });
  
  // Create the package
  console.log('Creating package...');
  execSync('npm run package', { stdio: 'inherit' });
  
  // Copy files for release
  const releaseDir = './release';
  console.log('Preparing release files...');
  
  // Copy module.json from dist
  fs.copyFileSync('./dist/module.json', path.join(releaseDir, 'module.json'));
  
  // Rename the versioned zip to module.zip
  const versionedZip = path.join(releaseDir, `foundry-rest-api-v${version}.zip`);
  const moduleZip = path.join(releaseDir, 'module.zip');
  
  if (fs.existsSync(versionedZip)) {
    fs.copyFileSync(versionedZip, moduleZip);
    console.log(`✓ Created module.zip from ${versionedZip}`);
  }
  
  console.log('\n✅ Release files prepared in ./release/');
  console.log('   - module.json');
  console.log('   - module.zip');
  
  console.log('\nNext steps:');
  console.log('1. Commit and push your changes:');
  console.log(`   git add -A`);
  console.log(`   git commit -m "Release v${version}"`);
  console.log(`   git push`);
  console.log('\n2. Create and push the tag:');
  console.log(`   git tag ${version}`);
  console.log(`   git push origin ${version}`);
  console.log('\n3. The GitHub Action will create the release automatically!');
  console.log('\nAlternatively, create a manual release on GitHub and upload:');
  console.log('   - release/module.json');
  console.log('   - release/module.zip');
  
} catch (error) {
  console.error('Error creating release:', error.message);
  process.exit(1);
}