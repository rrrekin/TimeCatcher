# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run dev` - Start development environment (Vite + Electron)
- `npm run build` - Full production build (type checking + Vite build + TypeScript compilation)
- `npm run test` - Run tests in watch mode
- `npm run test:run` - Run tests once and exit
- `npm run test:coverage` - Run tests with coverage reporting using v8 provider

### CI/CD Pipeline

**GitHub Actions Workflow** (`.github/workflows/ci.yml`):

- Runs on pull requests and pushes to main branch
- Tests on Node.js 18 and 20
- Executes `npm run test:coverage` and `npm run build`
- Uploads coverage reports to Codecov

### Important Notes

- Always use `npm run dev` for development (not `npm start`)
- Vite dev server runs on port 5173 and must be ready before Electron launches
- Main process TypeScript compiles to `dist/` directory

## Architecture Overview

### Electron Multi-Process Architecture

**Main Process** (`src/main/`): Application entry, window management, database service, IPC handlers

**Renderer Process** (`src/renderer/`): Vue 3 + TypeScript frontend with composable-first architecture

**Shared** (`src/shared/`): TypeScript interfaces and runtime constants

### Key Components

**Composables** (`src/composables/`):

- `useCategories.ts` - Category CRUD operations
- `useTaskRecords.ts` - Task management and validation
- `useSettings.ts` - Theme and localStorage management
- `useDurationCalculations.ts` - Duration calculations and aggregations
- `useAutoRefresh.ts` - Real-time updates for today's tasks
- `useListboxNavigation.ts` - Keyboard navigation for dropdowns

**Components** (`src/components/`):

- `TaskList.vue` - Task table with inline editing
- `DailyReport.vue` - Report visualization with category breakdowns
- `DateNavigation.vue` - Date controls and settings
- `SetupModal.vue` - Settings modal

**Utilities** (`src/utils/`):

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
  is_default BOOLEAN DEFAULT FALSE
);

CREATE TABLE task_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_name TEXT NOT NULL,
  task_name TEXT NOT NULL,
  start_time DATETIME NOT NULL,
  date TEXT NOT NULL,
  task_type TEXT DEFAULT 'normal' CHECK (task_type IN ('normal', 'pause', 'end'))
);
```

### Type System & Runtime Constants

**Task Type Management**:

- `TASK_TYPES` - Runtime constant `['normal', 'pause', 'end']`
- `SPECIAL_TASK_TYPES` - Runtime constant `['pause', 'end']`
- `DURATION_VISIBLE_BY_TASK_TYPE` - Controls duration display per task type
- `TaskRecordInsert` - Allows setting task_type during creation
- `TaskRecordUpdate` - Excludes immutable task_type

### IPC Communication

Standard pattern: Frontend → Preload → Main → Database
API methods: getCategories, addCategory, deleteCategory, updateCategory, setDefaultCategory, getTaskRecords, addTaskRecord, updateTaskRecord, deleteTaskRecord

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

**Setup Modal**: Theme settings, target work hours, category management
**Persistence**: localStorage for theme and target hours
**Window**: 1200x800 default, 1050x750 minimum, context isolation enabled

## Testing

Uses Vitest with @vitest/coverage-v8. Test types:

- Unit tests (`*.test.ts`) for utilities and composables
- Component tests for Vue components via @vue/test-utils
- Coverage reports in text, HTML, and LCOV formats

**Test Patterns**:

- Parameterized tests with `it.each()`
- Fresh instances in `beforeEach` for isolation
- Vitest fake timers for date/time testing
- Mock complex dependencies for focused testing

## Common Development Tasks

**Database Operations**: Add to DatabaseService → IPC handler → preload → types → composable

**Task Types**: Use `TASK_TYPES` for validation, `SPECIAL_TASK_TYPES` for logic, `DURATION_VISIBLE_BY_TASK_TYPE` for display

**UI Features**: Create components → use composables → follow props/events → add error handling

**Auto-refresh**: Use `useAutoRefresh` composable, only active for today's date

**Duration Logic**: Centralized in `useDurationCalculations`, use ALL records for boundaries

**Keyboard Navigation**: Use `useListboxNavigation` composable with ARIA support

**Settings**: Add to `useSettings` composable → localStorage persistence → UI controls in SetupModal

## Key Files

**Core**: `src/renderer/App.vue`, `src/main/database.ts`, `src/main/main.ts`, `src/shared/types.ts`

**Config**: `vite.config.ts`, `vitest.config.ts`

**Composables**: `src/composables/use*.ts` files

**Components**: `src/components/*.vue` files

**Utils**: `src/utils/timeUtils.ts`, `src/utils/dateUtils.ts`

**Tests**: `src/**/*.test.ts` files

## Key Recommendations

Always consider use of sequential thinking and memory-timecatcher MCPs, especially when working with complex code.
Use other MCPs if this can be useful for a specific task or step.