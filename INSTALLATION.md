# Installation Guide

This module includes automated installation scripts for easy setup.

## Prerequisites

- Node.js and npm installed ([Download Node.js](https://nodejs.org/))
- Foundry VTT v13 or higher
- QuickInsert module (optional, for search functionality)

## Quick Installation

### Windows

#### Option 1: Double-click Installation (Recommended for Users)
1. Double-click `install.bat`
2. Follow the prompts
3. The module will be built and copied to your Foundry modules directory

#### Option 2: Development Installation (For Developers)
1. Right-click `install-dev.bat` and select "Run as administrator"
2. This creates a symbolic link for live development
3. Changes to source files will reflect immediately after browser refresh

#### Option 3: PowerShell Command
```powershell
# Basic installation (copies files)
.\install.ps1

# Development installation (creates symlink - requires admin)
.\install.ps1 -Symlink

# Force overwrite existing installation
.\install.ps1 -Force

# Custom Foundry path
.\install.ps1 -FoundryPath "D:\FoundryVTT\Data\modules"
```

### macOS/Linux

```bash
# Make the script executable (first time only)
chmod +x install.sh

# Basic installation (copies files)
./install.sh

# Development installation (creates symlink)
./install.sh --symlink

# Force overwrite existing installation
./install.sh --force

# Custom Foundry path
./install.sh --path ~/Documents/FoundryVTT/Data/modules
```

## Manual Installation

If the scripts don't work for your setup:

1. **Build the module:**
   ```bash
   npm install
   npm run build
   ```

2. **Copy files to Foundry:**
   - Create folder: `[FoundryData]/modules/foundry-rest-api/`
   - Copy these items to that folder:
     - `dist/` folder (all contents)
     - `src/module.json`
     - `src/languages/` folder
     - `test-api*.js` files (optional, for testing)

## Installation Paths

The scripts automatically detect your Foundry installation:

- **Windows**: `%APPDATA%\FoundryVTT\Data\modules\`
- **macOS**: `~/Library/Application Support/FoundryVTT/Data/modules/`
- **Linux**: `~/.local/share/FoundryVTT/Data/modules/`

## Development Setup

For active development:

1. Run the development installation:
   - Windows: `install-dev.bat` (as administrator)
   - Unix: `./install.sh --symlink`

2. Start the build watcher:
   ```bash
   npm run dev
   ```

3. Make changes to TypeScript files
4. Refresh your Foundry browser tab to see changes

## Troubleshooting

### "Module not found" in Foundry
- Ensure the installation completed successfully
- Check that files exist in the modules directory
- Restart Foundry VTT

### "npm not found" error
- Install Node.js from https://nodejs.org/
- Restart your terminal/command prompt after installation

### Permission errors on Windows
- Run PowerShell as Administrator for symlink creation
- Or use the copy method instead (default)

### Build errors
- Delete `node_modules/` and `package-lock.json`
- Run `npm install` again
- Ensure you have Node.js v16 or higher

## Verifying Installation

After installation, the script will show:
```
✓ Module installed successfully!
  Name: Foundry REST API
  Version: 1.0.1
  Compatibility: Foundry v13 - v13
```

In Foundry:
1. Go to Settings → Manage Modules
2. Find "Foundry REST API" in the list
3. Enable the module
4. Configure in Settings → Module Settings

## Testing

The installation includes test scripts. After enabling the module, open the browser console (F12) and you'll see:
- Automatic basic tests running
- Commands for manual testing
- Performance monitoring tools

See [Testing Documentation](./test-api.js) for details.