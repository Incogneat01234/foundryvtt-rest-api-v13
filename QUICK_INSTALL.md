# Quick Installation Guide

## Simple Installation (Recommended)

1. **Build the module package:**
   ```bash
   npm install
   npm run build
   npm run package
   ```

2. **Install in Foundry VTT:**
   - Open Foundry VTT v13
   - Go to **Settings → Manage Modules → Install Module**
   - Click **Browse** at the bottom
   - Navigate to: `release/foundry-rest-api-v1.0.1.zip`
   - Select the file and click **Install**

3. **Enable the module:**
   - In your world, go to **Settings → Manage Modules**
   - Find "Foundry REST API" and enable it
   - Configure in **Settings → Module Settings**

## That's it! 🎉

The module is now installed and ready to use. The WebSocket API will be available on port 30001 by default.

## Testing the API

Once installed, you can test the API using the included test scripts in the browser console:
- `test-api.js` - Basic functionality tests
- `test-api-advanced.js` - Router endpoint tests
- `test-api-monitor.js` - Performance monitoring