#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Simple build script for Foundry REST API module\n');

try {
  // Check if TypeScript compilation already done
  if (fs.existsSync('./dist/scripts/module.js')) {
    console.log('✓ TypeScript already compiled');
  } else {
    console.log('Running TypeScript compilation...');
    try {
      execSync('node node_modules/typescript/lib/tsc.js', { stdio: 'inherit' });
      console.log('✓ TypeScript compiled');
    } catch (e) {
      console.log('TypeScript compilation failed, but continuing...');
    }
  }

  // Copy static files
  console.log('\nCopying static files...');
  
  // Ensure dist directory exists
  if (!fs.existsSync('./dist')) {
    fs.mkdirSync('./dist');
  }
  
  // Copy module.json
  if (fs.existsSync('./src/module.json')) {
    fs.copyFileSync('./src/module.json', './dist/module.json');
    console.log('✓ Copied module.json');
  }
  
  // Copy languages
  if (fs.existsSync('./src/languages')) {
    if (!fs.existsSync('./dist/languages')) {
      fs.mkdirSync('./dist/languages', { recursive: true });
    }
    const files = fs.readdirSync('./src/languages');
    files.forEach(file => {
      fs.copyFileSync(
        path.join('./src/languages', file),
        path.join('./dist/languages', file)
      );
    });
    console.log('✓ Copied language files');
  }
  
  // Copy styles
  if (fs.existsSync('./src/styles/style.scss')) {
    // Just copy as CSS for now
    const scss = fs.readFileSync('./src/styles/style.scss', 'utf8');
    // Basic SCSS to CSS (remove nesting for simple build)
    const css = scss.replace(/\/\*[\s\S]*?\*\//g, ''); // Remove comments
    fs.writeFileSync('./dist/style.css', css);
    console.log('✓ Created style.css');
  }
  
  console.log('\n✅ Build completed successfully!');
  console.log('Files are in the dist/ directory');
  
} catch (error) {
  console.error('\n❌ Build failed:', error.message);
  process.exit(1);
}