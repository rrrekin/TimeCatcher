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

## Commit Message Guidelines

TimeCatcher follows the [Conventional Commits](https://www.conventionalcommits.org/) specification for consistent commit messages and automatic version bumping.

### Format

```text
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Supported Types

- `feat`: New features → __MINOR__ version bump
- `fix`: Bug fixes → __PATCH__ version bump
- `docs`: Documentation changes → __PATCH__ version bump
- `style`: Code style changes (formatting, semicolons) → __PATCH__ version bump
- `refactor`: Code refactoring → __PATCH__ version bump
- `perf`: Performance improvements → __PATCH__ version bump
- `test`: Adding/updating tests → __PATCH__ version bump
- `build`: Build system changes → __PATCH__ version bump
- `ci`: CI/CD configuration → __PATCH__ version bump
- `chore`: Maintenance tasks → __PATCH__ version bump

### Breaking Changes

For __MAJOR__ version bumps, use one of these formats:

- Add `!` after type/scope: `feat!: redesign API` or `fix(core)!: remove deprecated method`
- Include `BREAKING CHANGE:` footer in commit body

### Examples

```text
feat: add task export functionality
fix: resolve timezone calculation bug
feat(ui): implement dark mode toggle
fix!: remove deprecated API endpoints
docs: update installation instructions
test: add unit tests for date utilities
```

### Scope (Optional)

Use scopes to indicate the area of change:

- `ui`: User interface changes
- `core`: Core application logic
- `db`: Database-related changes
- `api`: API/IPC changes
- `build`: Build configuration

## Pull Requests

When submitting pull requests:

1. Use conventional commit format in PR titles for automatic version bumping
2. Ensure the build passes: `npm run build`
3. Test all functionality manually
4. Follow the existing code style
5. Update documentation if needed
6. Do not include `.claude/` directory in commits
