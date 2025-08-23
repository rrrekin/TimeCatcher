# Contributing to TimeCatcher

## Development Setup

Follow the development setup instructions in the main README.md file.

## Claude Code Integration

This project includes configuration for [Claude Code](https://claude.ai/code), an AI-powered coding assistant.

### Local Settings

The `.claude/` directory contains local configuration files for Claude Code:

- `.claude/settings.local.json` - Local user settings and preferences
- Other Claude Code configuration files

__⚠️ IMPORTANT:__ The `.claude/` directory is __local-only__ and should __never__ be committed to version control or included in published packages.

This directory is automatically excluded via:

- `.gitignore` - Prevents git commits
- `.npmignore` - Prevents npm publishing (if applicable)

### Why Exclude .claude/?

- Contains user-specific local settings
- May include sensitive configuration data
- Should remain local to each developer's environment
- Not relevant for other contributors or deployment

## Development Guidelines

### Code Style

- Follow existing code conventions in the codebase
- Use TypeScript for type safety
- Follow Vue 3 Composition API patterns
- Maintain compact, space-efficient design

### Database Changes

When making database schema changes:

1. Update the schema in `src/main/database.ts`
2. Update TypeScript interfaces in `src/shared/types.ts`
3. Test with fresh database initialization

### Testing

Currently no automated tests are configured. Manual testing should cover:

- Task creation and editing
- Category management
- Date navigation
- Data persistence

## Pull Requests

When submitting pull requests:

1. Ensure the build passes: `npm run build`
2. Test all functionality manually
3. Follow the existing code style
4. Update documentation if needed
5. Do not include `.claude/` directory in commits
