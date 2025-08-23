# GitHub Branch Protection Setup

To enforce coverage requirements and prevent merging of PRs with insufficient test coverage, you need to set up branch protection rules on GitHub. This is done manually through the GitHub web interface.

## Steps to Enable Branch Protection

### 1. Navigate to Repository Settings
1. Go to your repository on GitHub
2. Click on **Settings** tab
3. Select **Branches** from the left sidebar

### 2. Add Branch Protection Rule
1. Click **Add rule**
2. In the "Branch name pattern" field, enter: `main`
3. Configure the following settings:

#### Required Status Checks
- ✅ **Require status checks to pass before merging**
- ✅ **Require branches to be up to date before merging**
- Under "Status checks that are required", add:
  - `test (20)` - for Node.js 20 tests
  - `test (22)` - for Node.js 22 tests

#### Additional Protection Settings (Recommended)
- ✅ **Require a pull request before merging**
  - ✅ **Require approvals**: Set to 1 or more
  - ✅ **Dismiss stale pull request approvals when new commits are pushed**
  - ✅ **Require review from code owners** (if you have a CODEOWNERS file)
- ✅ **Do not allow bypassing the above settings**

Note: GitHub enforces a 100 MB hard limit on pushes; consider CI checks or Git LFS for large assets instead.

### 3. Coverage Enforcement Details

The CI workflow now includes these coverage enforcement steps:

1. **Global Coverage Reporting**: All tests run with coverage collection
2. **Changed Files Coverage Check**: Only files modified in the PR are checked against thresholds:
   - **Lines**: 80% minimum
   - **Branches**: 85% minimum  
   - **Functions**: 80% minimum
   - **Statements**: 80% minimum

### 4. How It Works

When a PR is created or updated:

1. CI runs tests with coverage
2. The `scripts/check-coverage.js` script analyzes changed files (with intelligent fallbacks)
3. If any changed file doesn't meet the thresholds, the CI fails
4. GitHub branch protection prevents merging until CI passes
5. Developers must add tests to increase coverage before merging

### 5. Local Testing

Developers can test coverage locally before pushing:

```bash
# Run tests with coverage and check thresholds
npm run test:coverage:check

# Just run coverage check on existing coverage report
node scripts/check-coverage.js
```

### 6. Intelligent File Detection

The coverage check script uses a robust approach to determine which files to check:

1. **Primary**: Detects changed files using `git diff` against the PR base branch
2. **GitHub Integration**: Uses `GITHUB_BASE_REF` environment variable when available
3. **Fallback with Fetch**: If refs are missing, fetches remote refs and retries
4. **Final Fallback**: If git diff fails entirely, checks all tracked source files

### 7. Exemptions and Special Cases

- Files in `src/main/**` are excluded (Electron main process)
- Test files (`*.test.ts`, `*.spec.ts`) are excluded  
- TypeScript declaration files (`*.d.ts`) are excluded (no executable code)
- Configuration files are excluded
- If no files can be determined or coverage data is missing, the check passes
- Files with no metrics (N/A coverage) are treated as failures, not 100% coverage

### 8. Troubleshooting

**Issue**: Coverage check passes locally but fails in CI
- **Solution**: Ensure all changed files have corresponding tests

**Issue**: Coverage check fails for files with no coverage data
- **Solution**: Add at least basic tests for new files

**Issue**: Want to merge without meeting coverage (emergency)
- **Solution**: Repository admins can bypass branch protection, but this should be rare

## Benefits

✅ **Quality Assurance**: New code must be tested before merging  
✅ **Gradual Improvement**: Only new/modified code needs to meet standards  
✅ **Developer Feedback**: Clear feedback on which files need more tests  
✅ **Automated Enforcement**: No manual review needed for coverage  
✅ **Flexible**: Easy to adjust thresholds as project matures  

## Configuration Files

- **Coverage thresholds**: `scripts/check-coverage.js`
- **CI workflow**: `.github/workflows/ci.yml`
- **Vitest config**: `vitest.config.ts`
- **NPM scripts**: `package.json`