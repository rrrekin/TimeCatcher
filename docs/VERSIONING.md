# Semantic Versioning System

TimeCatcher uses a semi-automatic semantic versioning system that automatically bumps version numbers after successful CI completion.

## Overview

- __Package.json__: Contains full semantic versions (e.g., `0.20.0`, `0.20.1`, `0.20.2`)
- __Automatic Bumping__: Version incremented after successful CI runs based on original PR title
- __Git Tags__: Created manually during release process (planned for future implementation)

## Automatic Version Bumping

### After CI Success

When a pull request is merged to the `main` branch and CI passes successfully, the version is automatically bumped based on the original PR title using [Conventional Commits](https://www.conventionalcommits.org/) format:

## Conventional Commits Format

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

## Version Bump Rules

### PATCH Version Bumps (e.g., `0.20.0` → `0.20.1`)
- `fix`: Bug fixes
- `docs`: Documentation changes
- `style`: Code style changes (formatting, semicolons)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding/updating tests
- `build`: Build system changes
- `ci`: CI/CD configuration changes
- `chore`: Maintenance tasks

### MINOR Version Bumps (e.g., `0.20.0` → `0.21.0`)
- `feat`: New features

### MAJOR Version Bumps (e.g., `0.20.0` → `1.0.0`)
- Any type with `!` after type/scope: `feat!:`, `fix(core)!:`
- Any commit with `BREAKING CHANGE:` footer

## Examples

```text
feat: add task export functionality      → 0.20.0 → 0.21.0 (minor)
feat(ui): implement dark mode toggle     → 0.20.0 → 0.21.0 (minor)
fix: resolve timezone calculation bug    → 0.20.0 → 0.20.1 (patch)
docs: update installation guide          → 0.20.0 → 0.20.1 (patch)
perf: optimize database queries          → 0.20.0 → 0.20.1 (patch)
feat!: redesign database schema          → 0.20.0 → 1.0.0 (major)
fix(api)!: remove deprecated endpoints   → 0.20.0 → 1.0.0 (major)
```

## Scope Examples (Optional)

- `feat(ui): add settings panel`
- `fix(core): resolve memory leak`
- `docs(api): update IPC documentation`
- `test(db): add integration tests`

## Manual Version Bumping

For local development and testing, you can manually bump versions using npm scripts:

```bash
# Bump patch version (0.20.0 → 0.20.1)
npm run version:patch

# Bump minor version (0.20.0 → 0.21.0)  
npm run version:minor

# Bump major version (0.20.0 → 1.0.0)
npm run version:major
```

Each command will:

1. Update `package.json` with the new version
2. Create a commit with the version change
3. __Note__: Git tags will be created separately during release process

## Version Workflow Details

### GitHub Action Workflow

The `.github/workflows/version-bump.yml` workflow:

1. __Triggers__: On successful CI completion after PR merge to `main` branch
2. __Detects__: Original PR using commit-to-pulls API with search fallback
3. __Analyzes__: Original PR title to determine bump type
4. __Updates__: `package.json` with new version
5. __Creates__: Version bump PR and merges it automatically
6. __Commits__: Version change with clean automated message

### Version Bump Script

The `scripts/bump-version.js` script handles:

- __Version parsing__ and validation
- __Package.json updates__ with new versions
- __Commit creation__ with consistent messaging
- __PR title analysis__ for automatic bump type detection

## Best Practices

### PR Titles

Use conventional commit format in PR titles for automatic version detection:

```bash
# PATCH version bumps
fix: resolve task deletion bug
docs: update API documentation
style: fix code formatting issues
refactor: improve component structure
perf: optimize rendering performance
test: add unit tests for utilities
chore: update dependencies

# MINOR version bumps
feat: add data export functionality
feat: implement dark mode toggle
feat(ui): add new settings panel

# MAJOR version bumps
feat!: redesign database schema
fix(api)!: remove deprecated endpoints
feat: migrate to Vue 4

BREAKING CHANGE: This removes the legacy API
```


### Version History

All version changes are tracked in Git commits with the pattern:

```text
chore: bump [type] version

Automated version bump from merged PR #123: [PR title]
```

## Integration with Build Process

The version from `package.json` is automatically used by:

- __Electron Builder__: App version metadata
- __Build artifacts__: Version included in built applications
- __About dialogs__: Can display current version to users

## Checking Version Information

```bash
# Current version in package.json
npm version

# View version history
git log --oneline --grep="chore: bump.*version"

# Check specific version commit
git show --name-only <commit-hash>
```

## Future Enhancements

### Planned Release Process

Git tagging will be implemented as part of a separate manual release process that will:

- Create release tags pointing to specific versions
- Generate release notes from commit history
- Build and publish release artifacts
- Create GitHub releases with proper documentation

## Troubleshooting

### Version Rollback

To rollback a version bump:

```bash
# Revert the version commit
git revert HEAD

# Push the revert
git push origin main
```

### Manual Version Fix

If you need to manually fix a version:

```bash
# Edit package.json manually
# Commit the change
git add package.json
git commit -m "fix: correct version number"
git push origin main
```

### CI/CD Integration

The version bump happens only after CI passes, ensuring only validated code gets versioned. The workflow:

1. PR created → CI runs tests
2. PR approved and merged → CI workflow completes successfully
3. Version bump workflow triggers → Detects original PR → Creates version bump PR → Auto-merges

This two-stage approach ensures every version number represents code that has passed all tests and quality checks, with version bumps happening in separate, clean commits.
