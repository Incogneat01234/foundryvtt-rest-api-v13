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
  // Set CI environment variable for the build
  const buildEnv = { ...process.env, CI: 'true' };
  execSync('npm run build', { stdio: 'inherit', env: buildEnv });
  
  // Create the package
  console.log('Creating package...');
  execSync('npm run package', { stdio: 'inherit' });
  
  // The GitHub workflow will handle copying files
  console.log('\n✅ Module built and packaged successfully!');
  
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