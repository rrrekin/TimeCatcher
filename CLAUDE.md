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
- `npm run install-hooks` - Install git hooks for automatic markdown formatting

### CI/CD Pipeline

__GitHub Actions Workflow__ (`.github/workflows/ci.yml`):

- Runs on pull requests and pushes to main branch
- Tests on Node.js 20 (Maintenance) and 22 (Active LTS)
- Executes `npm run test:coverage` and `npm run build`
- Uploads coverage reports to Codecov from the Node.js 22 job

__Coverage Requirements for PRs__:

- Only changed files are checked (not entire codebase)
- Lines: 80% minimum coverage
- Branches: 85% minimum coverage  
- Functions: 75% minimum coverage
- Statements: 80% minimum coverage
- CI fails if any changed file doesn't meet thresholds
- Use `npm run test:coverage:check` to verify locally

### Important Notes

- Always use `npm run dev` for development (not `npm start`)
- Vite dev server runs on port 5173 and must be ready before Electron launches
- Main process TypeScript compiles to `dist/` directory

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

```sql
CREATE TABLE categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
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
- Category breakdown with progress bars
- Status indicators: ⚠️ (missing end task), 😊 (target reached)
- Configurable target work hours (default: 8)

### Duration Calculation Logic

- Uses all records for time boundaries, aggregates only standard tasks
- Last task duration based on date context (past: until midnight, today: until current time, future: zero)
- Consistent rounding: `Math.floor()` per-task before aggregation
- Auto-refresh for real-time updates when viewing today

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

Uses Vitest with @vitest/coverage-v8. Test types:

- Unit tests (`*.test.ts`) for utilities and composables
- Component tests for Vue components via @vue/test-utils
- Coverage reports in text, HTML, and LCOV formats

__Test Patterns__:

- Parameterized tests with `it.each()`
- Fresh instances in `beforeEach` for isolation
- Vitest fake timers for date/time testing
- Mock complex dependencies for focused testing

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

__Config__: `vite.config.ts`, `vitest.config.ts`, `.editorconfig`

__Composables__: `src/composables/use*.ts` files

__Components__: `src/components/*.vue` files

__Utils__: `src/utils/timeUtils.ts`, `src/utils/dateUtils.ts`

__Tests__: `src/**/*.test.ts` files

## Key Recommendations

Always consider use of sequential thinking and memory-timecatcher MCPs, especially when working with complex code.
Use other MCPs if this can be useful for a specific task or step.

Keep the CLAUDE.md context file up-to-date with the latest changes and as compact as possible.
