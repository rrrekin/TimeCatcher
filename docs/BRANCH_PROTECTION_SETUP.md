# GitHub Branch Protection Setup

To enforce coverage requirements and prevent merging of PRs with insufficient test coverage, you need to set up branch protection rules on GitHub. This is done manually through the GitHub web interface.

## Steps to Enable Branch Protection

### 1. Navigate to Repository Settings

1. Go to your repository on GitHub
2. Click on __Settings__ tab
3. Select __Branches__ from the left sidebar

### 2. Add Branch Protection Rule

1. Click __Add rule__
2. In the "Branch name pattern" field, enter: `main`
3. Configure the following settings:

#### Required Status Checks

- ✅ __Require status checks to pass before merging__
- ✅ __Require branches to be up to date before merging__
- Under "Status checks that are required", add:
  - `test (20)` - for Node.js 20 tests
  - `test (22)` - for Node.js 22 tests

#### Additional Protection Settings (Recommended)

- ✅ __Require a pull request before merging__
  - ✅ __Require approvals__: Set to 1 or more
  - ✅ __Dismiss stale pull request approvals when new commits are pushed__
  - ✅ __Require review from code owners__ (if you have a CODEOWNERS file)
- ✅ __Do not allow bypassing the above settings__

Note: GitHub enforces a 100 MB hard limit on pushes; consider CI checks or Git LFS for large assets instead.

### 3. Coverage Enforcement Details

The CI workflow now includes these coverage enforcement steps:

1. __Global Coverage Reporting__: All tests run with coverage collection
2. __Changed Files Coverage Check__: Only files modified in the PR are checked against thresholds:
   - __Lines__: 80% minimum
   - __Branches__: 85% minimum  
   - __Functions__: 80% minimum
   - __Statements__: 80% minimum

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

1. __Primary__: Detects changed files using `git diff` against the PR base branch
2. __GitHub Integration__: Uses `GITHUB_BASE_REF` environment variable when available
3. __Fallback with Fetch__: If refs are missing, fetches remote refs and retries
4. __Final Fallback__: If git diff fails entirely, checks all tracked source files

### 7. Exemptions and Special Cases

- Files in `src/main/**` are excluded (Electron main process)
- Test files (`*.test.ts`, `*.spec.ts`) are excluded  
- TypeScript declaration files (`*.d.ts`) are excluded (no executable code)
- Configuration files are excluded
- If no files can be determined or coverage data is missing, the check passes
- Files with no metrics (N/A coverage) are treated as failures, not 100% coverage

### 8. Troubleshooting

__Issue__: Coverage check passes locally but fails in CI

- __Solution__: Ensure all changed files have corresponding tests

__Issue__: Coverage check fails for files with no coverage data

- __Solution__: Add at least basic tests for new files

__Issue__: Want to merge without meeting coverage (emergency)

- __Solution__: Repository admins can bypass branch protection, but this should be rare

## Benefits

✅ __Quality Assurance__: New code must be tested before merging  
✅ __Gradual Improvement__: Only new/modified code needs to meet standards  
✅ __Developer Feedback__: Clear feedback on which files need more tests  
✅ __Automated Enforcement__: No manual review needed for coverage  
✅ __Flexible__: Easy to adjust thresholds as project matures  

## Configuration Files

- __Coverage thresholds__: `scripts/check-coverage.js`
- __CI workflow__: `.github/workflows/ci.yml`
- __Vitest config__: `vitest.config.ts`
- __NPM scripts__: `package.json`
