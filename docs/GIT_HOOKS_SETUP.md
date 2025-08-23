# Git Hooks Setup

This document explains how to set up and use git hooks in the TimeCatcher project for automated code quality checks.

## Available Git Hooks

### Pre-commit Hook

The pre-commit hook automatically formats markdown files before commits and prevents commits if there are unfixable formatting issues.

__Features:__

- ✅ Automatically formats markdown files using markdownlint-cli2
- ✅ Only processes staged markdown files (efficient)
- ✅ Re-stages fixed files automatically
- ✅ Provides clear feedback on issues
- ✅ Prevents commits with unfixable markdown issues

## Quick Setup

### Option 1: Automatic Installation (Recommended)

```bash
npm run install-hooks
```

This command copies all git hooks from `scripts/git-hooks/` to `.git/hooks/` and makes them executable.

### Option 2: Manual Installation

```bash
# Copy the pre-commit hook
cp scripts/git-hooks/pre-commit .git/hooks/pre-commit

# Make it executable
chmod +x .git/hooks/pre-commit
```

## How It Works

### Pre-commit Hook Workflow

1. __Trigger__: Runs automatically when you commit changes (`git commit`)
2. __Detection__: Identifies staged markdown files (`.md` files)
3. __Processing__: Runs `markdownlint-cli2` with auto-fix on staged files
4. __Re-staging__: Adds fixed files back to the staging area
5. __Result__:
   - ✅ __Success__: Commit proceeds if all issues are fixed
   - ❌ __Failure__: Commit blocked if unfixable issues remain

### Example Workflow

```bash
# Edit a markdown file with formatting issues
echo "**bold text** and *italic text*" > README.md

# Stage the file
git add README.md

# Attempt to commit - hook will run automatically
git commit -m "Update README"
```

__Output:__

```text
🔍 Checking markdown files for formatting issues...
📝 Running markdownlint on staged files: README.md
✅ Markdown formatting complete
[main abc1234] Update README
 1 file changed, 1 insertion(+)
```

The hook automatically converted `**bold text**` to `__bold text__` and `*italic text*` to `_italic text_` to match the configured style.

## Configuration

### Markdown Rules Configuration

The markdown formatting rules are configured in `.markdownlint-cli2.jsonc`:

- __Disabled rules__:
  - `MD013` (line length) - Often too restrictive for documentation
  - `MD034` (bare URLs) - Allows URLs without angle brackets

- __Style preferences__:
  - Headings: ATX style (`# Heading`)
  - Lists: Dash style (`- item`)
  - Emphasis: Underscore style (`__bold__`, `_italic_`)

### Files Processed

The hook processes:

- `*.md` files in the root directory
- `docs/**/*.md` files
- Excludes `node_modules/**` (automatically)

## Manual Commands

You can also run markdown formatting manually:

```bash
# Check all markdown files for issues
npm run lint:md

# Auto-fix all markdown files
npm run format:md

# Check specific files
npx markdownlint-cli2 README.md docs/SETUP.md

# Fix specific files
npx markdownlint-cli2 --fix README.md docs/SETUP.md
```

## Troubleshooting

### Hook Not Running

__Problem__: Git commits don't trigger the hook

__Solutions__:

1. Ensure hooks are installed: `npm run install-hooks`
2. Check hook permissions: `ls -la .git/hooks/pre-commit`
3. Verify executable bit: `chmod +x .git/hooks/pre-commit`

### Dependencies Missing

__Problem__: Hook shows "markdownlint-cli2 not found"

__Solution__:

```bash
npm install
```

### Bypass Hook (Emergency)

If you need to commit without running hooks:

```bash
git commit --no-verify -m "emergency commit"
```

__Note__: Use sparingly - this bypasses all quality checks.

### Hook Fails on Valid Files

__Problem__: Hook fails even though files look correct

__Solutions__:

1. Run `npm run lint:md` to see specific issues
2. Check `.markdownlint-cli2.jsonc` configuration
3. Run `npm run format:md` to auto-fix what's possible
4. Review the specific error messages in the hook output

## Development

### Adding New Hooks

1. Create the hook script in `scripts/git-hooks/`
2. Make it executable: `chmod +x scripts/git-hooks/[hook-name]`
3. Test it manually
4. Run `npm run install-hooks` to install
5. Update this documentation

### Modifying Existing Hooks

1. Edit the script in `scripts/git-hooks/`
2. Run `npm run install-hooks` to update the active hook
3. Test with a sample commit

### Hook Script Location

- __Shared scripts__: `scripts/git-hooks/` (tracked in git)
- __Active hooks__: `.git/hooks/` (not tracked in git, local only)

## Benefits

✅ __Consistent formatting__ across all markdown files  
✅ __Automatic fixes__ for common style issues  
✅ __Prevents commits__ with formatting problems  
✅ __Team consistency__ - everyone uses the same rules  
✅ __Documentation quality__ - ensures professional appearance  
✅ __Low overhead__ - only processes staged files  

## Related Commands

- `npm run lint:md` - Check markdown formatting
- `npm run format:md` - Fix markdown formatting
- `npm run install-hooks` - Install/update git hooks
- `git commit --no-verify` - Skip hooks (emergency use)
