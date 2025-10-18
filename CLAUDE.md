# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run dev` - Start development environment (Vite + Electron)
- `npm run build` - Full production build (type checking + Vite build + TypeScript compilation)
- `npm run test` - Run tests in watch mode
- `npm run test:run` - Run tests once and exit
- `npm run test:coverage` - Run tests with coverage reporting using V8 provider
- `npm run test:coverage:check` - Run tests with coverage and check thresholds for changed files
- `npm run lint:md` - Check markdown formatting issues
- `npm run format:md` - Auto-fix markdown formatting issues
- `npm run format` - Format all source code files with Prettier
- `npm run format:check` - Check if code formatting is consistent with Prettier
- `npm run install-hooks` - Install git hooks for automatic markdown and code formatting

See docs/VERSIONING.md for the full versioning workflow and npm commands.

### CI/CD Pipeline

__GitHub Actions Workflows__:

__CI Pipeline__ (`.github/workflows/ci.yml`):

- Runs on pull requests and pushes to main branch
- Tests on Node.js 20 (Maintenance) and 22 (Active LTS)
- Executes `npm run test:coverage` and `npm run build`
- Uploads coverage reports to Codecov from the Node.js 22 job

__Version Bump__ (`.github/workflows/version-bump.yml`):

- Runs automatically after CI completes successfully on main branch
- Detects original PR using commit-to-pulls API with search fallback
- Analyzes original PR title using Conventional Commits format to determine version bump type:
  - MAJOR: Any type with `!` suffix (e.g., feat!:, fix!:) or `BREAKING CHANGE:` footer
  - MINOR: `feat:` commits (new features)
  - PATCH: `fix:`, `docs:`, `style:`, `refactor:`, `perf:`, `test:`, `build:`, `ci:`, `chore:` (default)
- Updates package.json with new semantic version
- Git tags will be created separately during manual release process

__Coverage Requirements for PRs__:

- Only changed files are checked (not entire codebase)
- Lines: 80% minimum coverage
- Branches: 85% minimum coverage  
- Functions: 75% minimum coverage
- Statements: 80% minimum coverage
- CI fails if any changed file doesn't meet thresholds
- Use `npm run test:coverage:check` to verify locally

__Environment Variables__:

- `ELECTRON_SKIP_REBUILD=1` - Skips electron-rebuild during postinstall for faster CI test runs (set in CI workflow)

### Important Notes

- Always use `npm run dev` for development (not `npm start`)
- Vite dev server runs on port 5173 and must be ready before Electron launches
- Main process TypeScript compiles to `dist/` directory
- Always use IDE diagnostics to validate code after implementation

## Architecture Overview

### Electron Multi-Process Architecture

__Main Process__ (`src/main/`): Application entry, window management, database service, IPC handlers

__Renderer Process__ (`src/renderer/`): Vue 3 + TypeScript frontend with composable-first architecture

__Shared__ (`src/shared/`): TypeScript interfaces and runtime constants

### Key Components

__Composables__ (`src/composables/`):

- `useCategories.ts` - Category CRUD operations
- `useTaskRecords.ts` - Task management and validation
- `useSettings.ts` - Theme and localStorage management
- `useDurationCalculations.ts` - Duration calculations and aggregations
- `useAutoRefresh.ts` - Real-time updates for today's tasks
- `useListboxNavigation.ts` - Keyboard navigation for dropdowns

__Components__ (`src/components/`):

- `TaskList.vue` - Task table with inline editing
- `DailyReport.vue` - Report visualization with category breakdowns
- `DateNavigation.vue` - Date controls and settings
- `SetupModal.vue` - Settings modal

__Utilities__ (`src/utils/`):

- `timeUtils.ts` - Time parsing, formatting, and duration helpers
- `dateUtils.ts` - Date operations and timezone handling

### Database Architecture

SQLite with clean schema. Key features:

- Historical data preservation (tasks store `category_name` directly)
- Task types: 'normal', 'pause', 'end' (immutable after creation)
- One 'end' task per day constraint
- Default category protection
- Category code field: optional (empty string default), max 10 characters, non-unique, used for report exports

```sql
CREATE TABLE categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  code TEXT NOT NULL DEFAULT '',
  is_default BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE task_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_name TEXT NOT NULL,
  task_name TEXT NOT NULL,
  start_time DATETIME NOT NULL,
  date TEXT NOT NULL,
  task_type TEXT DEFAULT 'normal' CHECK (task_type IN ('normal', 'pause', 'end')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create covering index for date filtering and start_time ordering
CREATE INDEX IF NOT EXISTS idx_date_start_time ON task_records(date, start_time);

-- Create unique index to enforce one end task per day
CREATE UNIQUE INDEX IF NOT EXISTS idx_end_per_day ON task_records(date) WHERE task_type = 'end';
```

### Type System & Runtime Constants

__Category Interface__:

- `Category` interface: `{ id?: number, name: string, code: string, is_default?: boolean, created_at?: string }`
- `code` field is always a string (non-null), defaults to empty string `''`
- Max 10 characters validation enforced at composable level
- Trimmed before database operations

__Task Type Management__:

- `TASK_TYPES` - Runtime constant `['normal', 'pause', 'end']`
- `SPECIAL_TASK_TYPES` - Runtime constant `['pause', 'end']`
- `DURATION_VISIBLE_BY_TASK_TYPE` - Controls duration display per task type
- `TaskRecordInsert` - Allows setting task_type during creation
- `TaskRecordUpdate` - Excludes immutable task_type

### IPC Communication

Standard pattern: Frontend → Preload → Main → Database
API methods: getCategories, addCategory, deleteCategory, updateCategory, getDefaultCategory, setDefaultCategory, categoryExists, getTaskRecordsByDate, addTaskRecord, updateTaskRecord, deleteTaskRecord

## Component Architecture

### Vue 3 Patterns

- Composition API with `<script setup>`
- Reactive state via `ref()` and `computed()`
- Business logic in composables, UI logic in components
- Props/events communication pattern

### Key UI Features

- Inline editing (double-click table cells)
- Keyboard navigation for dropdowns
- Special task buttons ("Pause", "End")
- Auto-refresh for today's tasks (15-second interval)
- ARIA accessibility support

## Report Component

### Daily Report Features

- Smart duration calculation using ALL records as boundaries
- Task summarization with occurrence counts
- Category breakdown: listed by category without progress bars
- Status indicators: ⚠️ (missing end task), 😊 (target reached)
- Configurable target work hours (default: 8)
- __Dual time display__: Shows both actual time and rounded time in format: `ActualTime (RoundedTime)`. Rounding policy: each task's duration is first floored to the nearest whole minute, then the floored duration is rounded to the nearest 5-minute increment (e.g., 2m floored → 2m → 0m rounded; 7m floored → 7m → 5m rounded). Per-task floors occur before 5-minute rounding for the rounded totals.
- __Two-line header layout__: Title and status icons on first line, combined time totals on second line
- __Interactive hover tooltips__: Hover over any task entry to see individual appearances with start/end times and durations

### Duration Calculation Logic

- Uses all records for time boundaries, aggregates only standard tasks
- Last task duration based on date context (past: until midnight, today: until current time, future: zero)
- Consistent rounding: `Math.floor()` per-task before aggregation
- Auto-refresh for real-time updates when viewing today
- __Dual totaling__: Calculates both plain sum (actual minutes) and rounded sum (sum of per-task rounded durations). The rounded total is computed by rounding each individual task duration to the nearest 5 minutes, then summing those rounded values—this differs from taking the full-precision total and rounding it once.

### Report Display Structure

- __Day Summary__: Two-line layout with "Daily Report" title + icons, then combined time display showing `ActualTotal (RoundedTotal)`
- __Category Summary__: Each category shows dual time format with actual and rounded totals in brackets
- __Task Entries__: Individual tasks display combined format with actual time and rounded time in parentheses
- __Hover Tooltips__: Show detailed breakdown of each task appearance including start time, end time, and individual duration

## Design System

### Color Palette

- `--verdigris: #57bdaf`, `--mantis: #59c964`, `--asparagus: #69966f`, `--emerald: #56b372`, `--aero: #1fbff0`

### Design Principles

- Compact design, consistent color palette, green theme for deletions
- Minimum window: 1050x750 pixels

## Settings & Configuration

__Setup Modal__: Theme settings, target work hours, category management
__Persistence__: localStorage for theme and target hours
__Window__: 1200x800 default, 1050x750 minimum, context isolation enabled

## Testing

ALWAYS add tests with any new feature.

Uses Vitest with @vitest/coverage-v8. Test types:

- Unit tests (`*.test.ts`) for utilities and composables
- Component tests for Vue components via @vue/test-utils
- Coverage reports in text, HTML, and LCOV formats

__Test Patterns__:

- Parameterized tests with `it.each()`
- Fresh instances in `beforeEach` for isolation  
- Vitest fake timers for date/time testing and avoiding real delays (`vi.useFakeTimers()`, `vi.advanceTimersByTimeAsync()`)
- Mock complex dependencies for focused testing
- `createElectronAPIMock()` factory function for consistent electronAPI mocking with overrides

__Test Coverage Best Practices__:

- Always aim for high test coverage on new features and changed code
- Test edge cases and boundary conditions (e.g., screen edge positioning for tooltips)
- Cover error paths and fallback scenarios (e.g., clipboard API failures with document.execCommand fallback)
- Test component lifecycle methods and cleanup (e.g., onUnmounted callbacks)
- Verify both success and failure states for async operations
- Use specific assertions rather than broad existence checks (e.g., test exact CSS class presence, specific function calls)
- Test user interactions and their visual feedback (e.g., click handlers, hover states, keyboard events)
- Mock external dependencies appropriately while testing real logic paths
- Test computed properties with various input scenarios to ensure reactive updates work correctly

## Common Development Tasks

__Database Operations__: Add to DatabaseService → IPC handler → preload → types → composable

__Task Types__: Use `TASK_TYPES` for validation, `SPECIAL_TASK_TYPES` for logic, `DURATION_VISIBLE_BY_TASK_TYPE` for display

__UI Features__: Create components → use composables → follow props/events → add error handling

__Auto-refresh__: Use `useAutoRefresh` composable, only active for today's date

__Duration Logic__: Centralized in `useDurationCalculations`, use ALL records for boundaries

__Keyboard Navigation__: Use `useListboxNavigation` composable with ARIA support

__Settings__: Add to `useSettings` composable → localStorage persistence → UI controls in SetupModal

__Git Hooks__: Run `npm run install-hooks` after cloning to enable automatic markdown formatting on commits

## Key Files

__Core__: `src/renderer/App.vue`, `src/main/database.ts`, `src/main/main.ts`, `src/shared/types.ts`

__Config__: `vite.config.ts`, `vitest.config.ts`, `.editorconfig`, `.prettierrc.json`

__Composables__: `src/composables/use*.ts` files

__Components__: `src/components/*.vue` files

__Utils__: `src/utils/timeUtils.ts`, `src/utils/dateUtils.ts`

__Tests__: `src/**/*.test.ts` files

## Key Recommendations

Always consider use of sequential thinking MCP, especially when working with complex code.
Use other MCPs if this can be useful for a specific task or step.
For GUI verification, use the Puppeteer MCP server.

## Agent Coding Checklist

- Always add a11y labels.
- Tests: Always import `afterEach`, unmount and null wrappers to avoid DOM leakage. Use `vi.useFakeTimers()` + `vi.setSystemTime()` for time logic. Keep sorting tests under `describe('sortedTaskRecords')`. Assert current regex and `maxlength` omission. Run `npm run test:coverage:check` on Node 20/22.
- IPC/runtime guards: Check `window.electronAPI` and method presence; show user-friendly errors if missing.
- DOM timing: After opening dropdowns/toggles, `await nextTick()` before focusing/positioning.
- General: Prefer explicit refs/props over implicit DOM traversal; centralize shared regex/time helpers to avoid drift.

# Memory MCP Server Usage

## Core Principle: Memory-First Approach

__Before asking the user for any project context, ALWAYS check memory first.__

Use the memory MCP server to maintain persistent context about this project. Your goal is to minimize repetitive questions and work autonomously by building and leveraging a comprehensive memory of the project.

## Required Behaviors

### On First Session in This Project

When you detect this is your first time working on this project:

1. __Initialize project memory__ by storing:

- Project overview (language, framework, build system, architecture)
- Build and dependency information
- Code conventions and standards
- Key architectural decisions

2. __Ask the user once__ for high-level project information, then store it persistently

3. __Explore the codebase__ to discover and store:

- Testing patterns and frameworks
- Module/package structure
- Configuration locations
- Common patterns and conventions

### On Every Session Start

__Automatically query these memories:__

```
retrieve_memory: "project-overview"
retrieve_memory: "recent-changes"
retrieve_memory: "active-tasks"
```

__If working on specific areas, also query:__

- Relevant `arch:`, `pattern:`, `test:`, `mod:`, `dep:` memories
- Any `issue:` memories related to the current work

__Never ask the user for information that might be in memory.__

### During Development

__Continuously maintain memory by:__

1. __Storing immediately__ when you discover:

- New architectural decisions
- Code patterns or conventions
- Testing approaches
- Dependency information
- Known issues or workarounds
- Module responsibilities

2. __Updating existing memories__ when you find:

- Changed conventions
- Updated dependencies
- Evolved patterns
- Resolved issues

3. __Checking memory before__ you:

- Ask the user for context
- Make architectural decisions
- Write tests
- Implement features
- Debug issues

### Session End Behavior

Before ending a work session, __automatically store__:

- Summary of work completed
- Any TODOs or next steps
- New discoveries or changes made
- Updated status of active tasks

## Memory Categorization

__Use these prefixes consistently__ for all memory keys:

| Prefix     | Purpose                 | Examples                                         |
|------------|-------------------------|--------------------------------------------------|
| `arch:`    | Architectural decisions | `arch:layering`, `arch:error-handling`           |
| `dep:`     | Dependencies            | `dep:main-framework`, `dep:test-library`         |
| `test:`    | Testing patterns        | `test:unit-pattern`, `test:integration-setup`    |
| `build:`   | Build configuration     | `build:tasks`, `build:scripts`                   |
| `pattern:` | Code patterns           | `pattern:async`, `pattern:validation`            |
| `config:`  | Configuration           | `config:environment`, `config:database`          |
| `issue:`   | Known problems          | `issue:auth-bug`, `issue:performance-workaround` |
| `mod:`     | Module information      | `mod:api`, `mod:data-layer`                      |

__Special keys__ (no prefix):

- `project-overview` - High-level project information
- `recent-changes` - Recent work summary
- `active-tasks` - Current TODOs and priorities

## Proactive Memory Queries

### Before Asking User Questions

__Pattern to follow:__

1. Identify what information you need
2. Construct relevant memory queries
3. Retrieve using appropriate keywords
4. Only ask user if information is not in memory

__Example:__

```
User: "Add validation to the user endpoint"

Your process:
1. retrieve_memory: "mod:api" or "pattern:validation"
2. retrieve_memory: "arch:error-handling"
3. If found → Use that approach
4. If not found → Ask user, then store the decision
```

### Before Making Decisions

__Always check for existing patterns:__

```
retrieve_memory: "arch:[relevant-area]"
retrieve_memory: "pattern:[relevant-pattern]"
```

__If no pattern exists:__

1. Discuss approach with user
2. Implement the solution
3. __Immediately store__ the decision with rationale

### Before Writing Tests

__Always retrieve testing patterns:__

```
retrieve_memory: "test:[layer-or-type]"
retrieve_memory: "test:setup"
```

__Follow stored conventions.__ If none exist, establish them and store.

### During Debugging

__Check for known issues first:__

```
retrieve_memory: "issue:[component-name]"
retrieve_memory: "issue:[symptom-keyword]"
```

__When you solve a bug:__

```
store_memory: "issue:[descriptive-name]"
Include: problem, root cause, solution, prevention measures
```

## What to Store

__Store:__

- Architectural decisions and their rationale
- Code conventions and patterns
- Testing strategies and setup
- Build configurations and tasks
- Module responsibilities and interfaces
- Known issues and their workarounds
- Configuration approaches
- Important dependency information

__Don't Store:__

- Large code blocks (store patterns and references instead)
- Temporary values or session state
- Trivial or obvious information
- Duplicate information

## Memory Update Strategy

__When information changes:__

- __Update__ existing memory rather than creating new entries
- Note what changed and why
- Preserve historical context if relevant to future decisions

__When information becomes outdated:__

- Update or delete obsolete memories
- Store migration notes if relevant

## Workflow Integration

### Test-Driven Development

1. __Red Phase:__ Check `test:` memories for patterns before writing test
2. __Green Phase:__ Use `arch:` and `pattern:` memories for implementation
3. __Refactor Phase:__ Store any new patterns discovered

### Feature Implementation

1. __Before starting:__ Query relevant `arch:`, `mod:`, `pattern:` memories
2. __During work:__ Follow stored conventions
3. __After completion:__ Store any new patterns or decisions

### Code Review

__Before suggesting changes:__

- Check `pattern:` and `arch:` memories for project standards
- Ensure suggestions align with stored conventions

## Efficiency Guidelines

__Batch queries at session start:__

```
retrieve_memory: "project-overview"
retrieve_memory: "recent-changes"
retrieve_memory: "arch:*" (if working on architecture)
```

__Store after logical completion:__

- After solving a problem
- After making a decision
- After discovering a pattern
- At end of work session

__Use consistent terminology:__

- Make keys searchable and predictable
- Follow the prefix conventions strictly
- Use descriptive names

## Required Workflow Pattern

__Standard interaction pattern:__

```
1. User makes a request
2. You determine what context is needed
3. Query relevant memories
4. Use retrieved context in your response
5. Store any new discoveries
6. Respond to user
```

__Anti-pattern (don't do this):__

```
1. User makes a request
2. You immediately ask: "What framework are you using?"
3. User provides context you should have in memory
```

## Decision-Making Framework

__When you need to make a choice:__

1. __Check memory first:__ Is there an existing pattern or decision?
2. __If yes:__ Follow it consistently
3. __If no:__

- Check if it's a significant decision → Ask user
- If minor → Make reasonable choice, document it
- Store the decision immediately

__Always document "why" not just "what"__ in architectural memories.

## Debugging Protocol

__Step 1: Check for known issues__

```
retrieve_memory: "issue:[component]"
```

__Step 2: Document investigation__

- As you debug, note findings
- When solved, immediately store complete context

__Step 3: Link related context__

- Reference relevant `arch:` or `mod:` memories
- Note any pattern violations that caused the issue

## Autonomous Operation

__Your goal:__ Work as autonomously as possible by:

- Building comprehensive project memory over time
- Always checking memory before asking questions
- Storing all significant decisions and patterns
- Maintaining consistency with stored conventions
- Reducing user's need to repeat information

__Success metric:__ User rarely needs to explain the same project context twice.

---

__Remember:__ Memory is your persistent context. Use it proactively to work faster and more consistently.

## Versioning System

TimeCatcher uses semi-automatic semantic versioning with PR-based automatic bumps. See docs/VERSIONING.md for complete workflow details, npm commands, and release processes.

## Homebrew Cask Maintenance

TimeCatcher supports installation via Homebrew cask through a custom tap.

### Repository Structure

- __Main Repository__: `rrrekin/TimeCatcher` (this repository)
- __Homebrew Tap__: `rrrekin/homebrew-timecatcher` (separate repository)
- __Cask Formula__: `Casks/timecatcher.rb`

### Automated Updates

The Homebrew cask is automatically updated when new releases are published:

1. __Manual Release Workflow__ (`manual-release.yml`) includes `update-homebrew` job
2. __Triggers only for non-draft, non-prerelease versions__
3. __Calls homebrew tap's `update-cask.yml` workflow__ with version and download URL
4. __Downloads DMG and calculates SHA256__ checksum for security
5. __Updates cask formula__ and commits changes automatically

### Requirements

- __HOMEBREW_PAT__: GitHub Personal Access Token with `repo` and `workflow` scopes for accessing and updating the homebrew tap repository
  - __Main repository secret__: `HOMEBREW_PAT` (for triggering updates)
  - __Tap repository secret__: `PAT` (for committing changes)
- __Architecture__: Currently supports ARM64 only (modern Macs)
- __macOS Compatibility__: Requires macOS with Homebrew installed

### Troubleshooting

- __Update fails__: Check HOMEBREW_PAT secret is valid and has proper permissions
- __Download errors__: Verify DMG URL follows expected pattern: `TimeCatcher-{version}-mac-arm64.dmg`
- __Permission issues__: Homebrew installation automatically removes quarantine attributes via `postflight` block
- __Version mismatch__: Ensure the cask formula version matches the GitHub release tag
