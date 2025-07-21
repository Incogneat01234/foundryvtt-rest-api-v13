# GitHub Settings to Check

If GitHub Actions still aren't triggering, check these settings:

## 1. Actions Settings
Go to: https://github.com/Incogneat01234/foundryvtt-rest-api-v13/settings/actions/general

Check:
- **Actions permissions**: Should be "Allow all actions and reusable workflows"
- **Workflow permissions**: Should be "Read and write permissions"
- **Allow GitHub Actions to create and approve pull requests**: Should be checked

## 2. Check Default Branch
Go to: https://github.com/Incogneat01234/foundryvtt-rest-api-v13/settings

Check:
- Default branch should be `main`
- Workflows must be in the default branch to trigger

## 3. Check for Branch Protection
Go to: https://github.com/Incogneat01234/foundryvtt-rest-api-v13/settings/branches

Check:
- If there are branch protection rules, they might block Actions

## 4. Check Repository Visibility
- If the repo is private, you might have Actions minutes limits
- Check: https://github.com/settings/billing

## 5. Manual Workflow Trigger
If automated triggers don't work:

1. Go to: https://github.com/Incogneat01234/foundryvtt-rest-api-v13/actions
2. Click on a workflow (like "Simple Release")
3. Click "Run workflow"
4. Select branch and enter parameters

## 6. Check Workflow Syntax
Run this locally to check workflow syntax:
```bash
# Install act (GitHub Actions locally)
# https://github.com/nektos/act

# Test workflows
act -l
```

## 7. Enable Actions if Disabled
If you see "Workflows aren't being run on this repository":

1. Go to Settings → Actions → General
2. Select "Allow all actions and reusable workflows"
3. Save

## 8. Check GitHub Status
Sometimes GitHub Actions have issues:
https://www.githubstatus.com/