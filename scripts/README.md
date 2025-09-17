# Scripts Documentation

This directory contains automation scripts for the TimeCatcher project.

## Scripts Overview

### `generate-changelog.sh`

__Purpose__: Generates structured changelogs from git commits using Conventional Commits format.

__Features__:

- Parses conventional commit messages (`type(scope): description`)
- Detects breaking changes via `!` syntax and `BREAKING CHANGE:` footer
- Categorizes commits into sections with emoji indicators
- Supports scoped commits with bold formatting
- Configurable commit type inclusion (main types vs all types)
- Debug mode for troubleshooting
- Bash 3.x compatible (works on older macOS systems)

__Usage__:

```bash
# Generate changelog from last tag to HEAD
./generate-changelog.sh "v1.0.0..HEAD" CHANGELOG.md

# Generate changelog from repository start
./generate-changelog.sh "$(git rev-list --max-parents=0 HEAD)..HEAD"

# Debug mode with all commit types
DEBUG=1 INCLUDE_ALL=1 ./generate-changelog.sh "v1.0.0..HEAD"
```

__Environment Variables__:

- `DEBUG=1` - Enable debug output showing parsing details
- `INCLUDE_ALL=1` - Include all commit types (default: only main types)

__Supported Commit Types__:

- `feat` - New features (🚀 Features)
- `fix` - Bug fixes (🐛 Bug Fixes)
- `perf` - Performance improvements (⚡ Performance Improvements)
- `docs` - Documentation changes (📚 Documentation)
- `style` - Code style changes (🎨 Code Style)
- `refactor` - Code refactoring (♻️ Refactoring)
- `test` - Testing changes (✅ Testing)
- `build` - Build system changes (🏗️ Build System)
- `ci` - CI/CD changes (⚙️ CI/CD)
- `chore` - Other changes (🔧 Other Changes)

__Breaking Changes Detection__:

- Type with `!` (e.g., `feat!: remove legacy API`)
- Commit with `BREAKING CHANGE:` footer

__Output Format__:

```markdown
# What's Changed

## 💥 BREAKING CHANGES
- remove legacy API

## 🚀 Features
- **scope**: description
- description without scope

## 🐛 Bug Fixes
- fix description
```

### `test-changelog.sh`

__Purpose__: Simple test suite for validating changelog generation functionality.

__Usage__:

```bash
# Run basic tests
./test-changelog.sh

# Run tests with verbose output
./test-changelog.sh --verbose
```

__Test Coverage__:

- Basic changelog generation
- Breaking changes detection
- Section generation for different commit types
- Debug mode functionality

### `bump-version.js`

__Purpose__: Handles version bumping for semantic versioning.

__Features__:

- Updates `package.json` with new version
- Creates git commits with version changes
- Supports MAJOR, MINOR, and PATCH bumps
- Integrates with GitHub Actions workflow

## Integration with CI/CD

These scripts are integrated into the GitHub Actions workflows:

### Manual Release Workflow (`.github/workflows/manual-release.yml`)

- Uses `generate-changelog.sh` to create release notes
- Called during release creation process
- Generates changelog from git range between releases

### Version Bump Workflow (`.github/workflows/version-bump.yml`)

- Uses `bump-version.js` to increment version numbers
- Triggered after successful CI completion
- Analyzes PR titles to determine bump type

## Conventional Commits Examples

### Standard Commits

```text
feat: add user authentication system
feat(ui): implement dark mode toggle
fix: resolve memory leak in task processor
fix(core): handle edge case in time calculation
docs: update API documentation
docs(readme): add installation instructions
style: fix code formatting issues
refactor: improve component structure
perf: optimize database queries
test: add unit tests for utilities
build: update webpack configuration
ci: improve GitHub Actions workflow
chore: update dependencies
```

### Breaking Changes

```text
feat!: redesign database schema
fix(api)!: remove deprecated endpoints
feat: add new authentication system

BREAKING CHANGE: This removes the legacy authentication API
```

### Scoped Commits

```text
feat(ui): add settings panel
fix(core): resolve memory leak
docs(api): update IPC documentation
test(db): add integration tests
```

## Best Practices

### For Developers

1. __Use conventional commit format__ in all commit messages
2. __Include scope__ when applicable (e.g., `feat(ui):`, `fix(core):`)
3. __Mark breaking changes__ with `!` or `BREAKING CHANGE:` footer
4. __Write clear descriptions__ that explain what changed, not how

### For Release Management

1. __Test changelog generation__ locally before releases
2. __Review generated changelogs__ for accuracy
3. __Use debug mode__ when troubleshooting parsing issues
4. __Include all relevant commit types__ in major releases

### For CI/CD

1. __Ensure scripts are executable__ (`chmod +x`)
2. __Validate git ranges__ before changelog generation
3. __Handle empty commit types__ gracefully
4. __Preserve script compatibility__ with bash 3.x

## Troubleshooting

### Common Issues

__Script fails with "unbound variable"__:

- Ensure bash 3.x compatibility
- Check that all variables are properly initialized

__No commits found in range__:

- Verify git range is valid: `git rev-list --count "range"`
- Check that commits exist in the specified range

__Missing sections in changelog__:

- Use `DEBUG=1` to see parsing details
- Verify commit messages follow conventional format
- Check that commit types are supported

__Changelog generation hangs__:

- Verify git repository is accessible
- Check that git commands complete successfully
- Use timeout for long-running operations

### Debug Mode

Enable debug mode to see detailed parsing information:

```bash
DEBUG=1 ./generate-changelog.sh "v1.0.0..HEAD" debug-changelog.md
```

Debug output includes:

- Parsed commit components (type, scope, description)
- Breaking change detection details
- Section generation progress
- Commit type filtering decisions

## Dependencies

### System Requirements

- bash 3.2+ (compatible with macOS default bash)
- git 1.8+
- Standard POSIX utilities (grep, sed, etc.)

### No External Dependencies

- Scripts use only built-in bash features
- Compatible with older systems
- No npm packages or external tools required

## Maintenance

### Adding New Commit Types

1. Update `get_commit_type_title()` function
2. Update `is_valid_commit_type()` function
3. Add to documentation in script header
4. Update this README file
5. Add test cases for new type

### Modifying Output Format

1. Update `generate_changelog_section()` function
2. Modify emoji mappings in `get_commit_type_title()`
3. Update documentation examples
4. Test with various commit message formats

### Compatibility Updates

1. Test on target systems (bash 3.x, bash 4.x, bash 5.x)
2. Avoid bash 4+ specific features
3. Use POSIX-compatible commands
4. Maintain backward compatibility
