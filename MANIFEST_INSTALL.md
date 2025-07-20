# Installing via Manifest URL

## How to Install Using the Manifest URL

1. **Once a release is created on GitHub**, you can install the module directly in Foundry using the manifest URL
2. In Foundry VTT, go to **Settings → Manage Modules → Install Module**
3. In the **Manifest URL** field at the bottom, paste:
   ```
   https://github.com/Incogneat01234/foundryvtt-rest-api-v13/releases/latest/download/module.json
   ```
4. Click **Install**

## Creating a GitHub Release

To make the manifest URL work, you need to create a GitHub release:

### Option 1: Manual Release
1. Go to your repository on GitHub
2. Click **Releases** → **Create a new release**
3. Choose a tag (e.g., `1.0.1`) - create new tag on publish
4. Upload these files as release assets:
   - `dist/module.json`
   - The module zip file created by `npm run package` (rename it to `module.zip`)
5. Publish the release

### Option 2: Automated Release (using tags)
1. Commit and push your changes
2. Create and push a version tag:
   ```bash
   git tag 1.0.1
   git push origin 1.0.1
   ```
3. The GitHub Action will automatically:
   - Build the module
   - Create the release
   - Upload module.json and module.zip

## How It Works

- The `manifest` URL in module.json points to: `.../releases/latest/download/module.json`
- The `download` URL in module.json points to: `.../releases/latest/download/module.zip`
- GitHub's "latest" release feature automatically serves the most recent release
- When Foundry fetches the manifest, it reads the download URL and fetches the zip

## Testing Your Manifest URL

After creating a release, test the URLs:
1. Visit `https://github.com/Incogneat01234/foundryvtt-rest-api-v13/releases/latest/download/module.json` in your browser
2. It should download or display the module.json file
3. If you get a 404, check that:
   - You've created at least one release
   - The release has `module.json` attached as an asset
   - The asset is named exactly `module.json` (not `foundry-rest-api-v1.0.1.json`)

## Version Management

Remember to update the version in `src/module.json` before creating each release!