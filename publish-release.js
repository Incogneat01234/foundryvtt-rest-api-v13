#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = '') {
  console.log(color + message + colors.reset);
}

function execCommand(command, description) {
  log(`\n→ ${description}...`, colors.blue);
  try {
    execSync(command, { stdio: 'inherit', shell: true });
    log(`✓ ${description} completed`, colors.green);
    return true;
  } catch (error) {
    log(`✗ ${description} failed: ${error.message}`, colors.red);
    return false;
  }
}

async function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function main() {
  log('\n🚀 FOUNDRY REST API - ONE-CLICK RELEASE SCRIPT 🚀\n', colors.bright + colors.cyan);

  // Read current version
  const moduleJson = JSON.parse(fs.readFileSync('./src/module.json', 'utf8'));
  const currentVersion = moduleJson.version;
  
  log(`Current version: ${currentVersion}`, colors.yellow);
  
  // Check for uncommitted changes
  try {
    execSync('git diff-index --quiet HEAD --', { stdio: 'pipe' });
  } catch {
    log('\n⚠️  You have uncommitted changes!', colors.yellow);
    const proceed = await askQuestion('Do you want to commit them as part of this release? (y/n): ');
    if (proceed.toLowerCase() !== 'y') {
      log('Release cancelled.', colors.red);
      rl.close();
      process.exit(1);
    }
  }
  
  // Ask for version bump
  const versionType = await askQuestion(`\nHow should we bump the version?\n1) Patch (${currentVersion} → ${bumpVersion(currentVersion, 'patch')})\n2) Minor (${currentVersion} → ${bumpVersion(currentVersion, 'minor')})\n3) Major (${currentVersion} → ${bumpVersion(currentVersion, 'major')})\n4) Keep current (${currentVersion})\nChoose (1-4): `);
  
  let newVersion = currentVersion;
  if (versionType !== '4') {
    const types = { '1': 'patch', '2': 'minor', '3': 'major' };
    newVersion = bumpVersion(currentVersion, types[versionType] || 'patch');
    
    // Update version in files
    log(`\nUpdating version to ${newVersion}...`, colors.blue);
    
    // Update module.json
    moduleJson.version = newVersion;
    fs.writeFileSync('./src/module.json', JSON.stringify(moduleJson, null, 2) + '\n');
    
    // Update package.json
    const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
    packageJson.version = newVersion;
    fs.writeFileSync('./package.json', JSON.stringify(packageJson, null, 2) + '\n');
    
    log(`✓ Version updated to ${newVersion}`, colors.green);
  }
  
  // Get commit message
  const defaultMessage = `Release v${newVersion}`;
  const commitMessage = await askQuestion(`\nCommit message (default: "${defaultMessage}"): `) || defaultMessage;
  
  log('\n📦 Starting release process...', colors.bright);
  
  // 1. Build the module
  if (!execCommand('npm run build', 'Building module')) {
    rl.close();
    process.exit(1);
  }
  
  // 2. Create the package
  if (!execCommand('npm run package', 'Creating release package')) {
    rl.close();
    process.exit(1);
  }
  
  // 3. Stage all changes
  if (!execCommand('git add -A', 'Staging changes')) {
    rl.close();
    process.exit(1);
  }
  
  // 4. Commit changes
  const commitCmd = `git commit -m "${commitMessage}"`;
  if (!execCommand(commitCmd, 'Committing changes')) {
    // Check if there's nothing to commit
    try {
      execSync('git diff-index --quiet HEAD --', { stdio: 'pipe' });
      log('No changes to commit', colors.yellow);
    } catch {
      rl.close();
      process.exit(1);
    }
  }
  
  // 5. Create tag
  const tagMessage = `Version ${newVersion}`;
  const tagCmd = `git tag -a ${newVersion} -m "${tagMessage}"`;
  if (!execCommand(tagCmd, `Creating tag ${newVersion}`)) {
    log('\nTag might already exist, continuing...', colors.yellow);
  }
  
  // 6. Push to remote
  log('\n📤 Pushing to GitHub...', colors.cyan);
  
  if (!execCommand('git push', 'Pushing commits')) {
    rl.close();
    process.exit(1);
  }
  
  if (!execCommand(`git push origin ${newVersion}`, 'Pushing tag')) {
    rl.close();
    process.exit(1);
  }
  
  // Success!
  log('\n' + '='.repeat(60), colors.green);
  log('🎉 RELEASE COMPLETED SUCCESSFULLY! 🎉', colors.bright + colors.green);
  log('='.repeat(60), colors.green);
  
  log(`\n✅ Version ${newVersion} has been:`, colors.green);
  log('   • Built and packaged', colors.green);
  log('   • Committed to git', colors.green);
  log('   • Tagged', colors.green);
  log('   • Pushed to GitHub', colors.green);
  
  log('\n📋 The GitHub Action will now:', colors.cyan);
  log('   • Create a GitHub release', colors.cyan);
  log('   • Upload module.json and module.zip', colors.cyan);
  log('   • Make it available via the manifest URL', colors.cyan);
  
  log('\n🔗 Your manifest URL:', colors.yellow);
  log('   https://github.com/Incogneat01234/foundryvtt-rest-api-v13/releases/latest/download/module.json', colors.bright);
  
  log('\n📦 Release files created:', colors.blue);
  log(`   • release/module.json`, colors.gray);
  log(`   • release/module.zip`, colors.gray);
  log(`   • release/foundry-rest-api-v${newVersion}.zip`, colors.gray);
  
  rl.close();
}

function bumpVersion(version, type) {
  const parts = version.split('.').map(n => parseInt(n));
  switch (type) {
    case 'major':
      return `${parts[0] + 1}.0.0`;
    case 'minor':
      return `${parts[0]}.${parts[1] + 1}.0`;
    case 'patch':
    default:
      return `${parts[0]}.${parts[1]}.${parts[2] + 1}`;
  }
}

// Run the script
main().catch(error => {
  log(`\n❌ Error: ${error.message}`, colors.red);
  rl.close();
  process.exit(1);
});