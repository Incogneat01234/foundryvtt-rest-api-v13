# Simple API Release Information

## Module Installation URL

Users can install the Simple API module directly in Foundry VTT using this manifest URL:

```
https://github.com/Incogneat01234/foundryvtt-rest-api-v13/releases/latest/download/module.json
```

## How It Works

1. **GitHub Releases**: When you push a tag (e.g., v1.0.1), GitHub Actions automatically:
   - Builds the module package
   - Creates a release
   - Uploads `module.json` and `module.zip` as release assets

2. **Foundry Installation**: Users paste the manifest URL in Foundry's module installer
   - Foundry downloads the `module.json` to read module info
   - Foundry then downloads `module.zip` from the URL specified in module.json
   - The module is extracted to the user's modules folder

3. **Module Structure**: The `module.zip` contains:
   ```
   module.json          # Manifest file
   scripts/
   └── simple-api.js    # Module code
   ```

## Publishing a New Version

1. Update version in `module/module.json`
2. Run `publish-simple-api.bat`
3. GitHub Actions will create the release automatically
4. Users can update through Foundry's module management

## Direct Links

- Latest Release: https://github.com/Incogneat01234/foundryvtt-rest-api-v13/releases/latest
- Module Manifest: https://github.com/Incogneat01234/foundryvtt-rest-api-v13/releases/latest/download/module.json
- Module Package: https://github.com/Incogneat01234/foundryvtt-rest-api-v13/releases/latest/download/module.zip