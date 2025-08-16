# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Development Workflow

- `npm run dev` - Start development environment (runs Vite dev server + Electron concurrently)
- `npm run dev:vite` - Run Vite dev server only (port 5173)
- `npm run dev:electron` - Compile TypeScript and launch Electron only

### Build Commands

- `npm run build` - Full production build (type checking + Vite build + TypeScript compilation)
- `npm run build:win` / `npm run build:mac` / `npm run build:linux` - Platform-specific builds

### Important Notes

- Always use `npm run dev` for development (not `npm start`)
- Vite dev server runs on port 5173 and must be ready before Electron launches
- Main process TypeScript compiles to `dist/` directory

## Architecture Overview

### Electron Multi-Process Architecture

**Main Process** (`src/main/`):

- `main.ts` - Application entry, window management, IPC handlers
- `database.ts` - SQLite service using better-sqlite3
- `preload.ts` - Secure IPC bridge via contextBridge

**Renderer Process** (`src/renderer/`):

- Vue 3 + TypeScript frontend
- Single App.vue component with Composition API
- No external state management (uses reactive refs)

**Shared** (`src/shared/`):

- `types.ts` - TypeScript interfaces, runtime constants, and type-safe API definitions

### Database Architecture

Uses SQLite with clean table initialization. Key patterns:

- **Historical Data Preservation**: Tasks store `category_name` directly (not foreign key)
- **Simple Schema**: Clean table creation without migrations (pre-release version)
- **Default Category Protection**: Cannot delete category marked as default
- **Special Task Support**: Tasks can be marked as 'normal', 'pause', or 'end' types
- **Daily End Task Constraint**: Only one 'end' task allowed per day (enforced by unique index)
- **Immutable Task Types**: Task type cannot be changed after creation (enforced by TypeScript)

Database schema:

```sql
-- Categories for current category management
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)

-- Task records preserve historical category names and support task types
CREATE TABLE IF NOT EXISTS task_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_name TEXT NOT NULL,
  task_name TEXT NOT NULL,
  start_time DATETIME NOT NULL,
  date TEXT NOT NULL,
  task_type TEXT DEFAULT 'normal' CHECK (task_type IN ('normal', 'pause', 'end')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)

-- Covering index for date filtering and start_time ordering
CREATE INDEX IF NOT EXISTS idx_date_start_time ON task_records(date, start_time);

-- Unique index to enforce one end task per day
CREATE UNIQUE INDEX IF NOT EXISTS idx_end_per_day ON task_records(date) WHERE task_type = 'end';
```

### IPC Communication Pattern

All database operations follow the pattern:

1. Frontend calls `window.electronAPI.methodName()`
2. Preload script routes to `ipcRenderer.invoke('db:method-name')`
3. Main process handles via `ipcMain.handle('db:method-name')`
4. Database service performs operation

API methods: getCategories, addCategory, deleteCategory, updateCategory, setDefaultCategory, getDefaultCategory, addTaskRecord, getTaskRecordsByDate, updateTaskRecord, deleteTaskRecord

### Type System & Runtime Constants

**Task Type Management**:

- `TASK_TYPES` - Runtime constant array `['normal', 'pause', 'end']` for validation and UI generation
- `TaskType` - Derived type alias using `typeof TASK_TYPES[number]` to eliminate duplication
- `SpecialTaskType` - Derived as `Exclude<TaskType, 'normal'>` to stay synchronized
- `SPECIAL_TASK_TYPES` - Runtime array `['pause', 'end']` for special task handling

**Duration Display Configuration**:

- `DURATION_VISIBLE_BY_TASK_TYPE` - Centralized mapping controlling which task types show duration:
  - `normal: true` - Regular tasks show calculated duration
  - `pause: true` - Pause tasks show calculated duration  
  - `end: false` - End tasks hide duration (no meaningful duration)

**Immutable Task Types**:

- `TaskRecordInsert` - Allows setting task_type during creation
- `TaskRecordUpdate` - Excludes task_type to prevent modification after creation
- Type safety enforced throughout IPC chain (preload → main → database)

### TypeScript Configuration

Two separate tsconfig files:

- `tsconfig.json` - Frontend (Vue, ESNext modules, bundler resolution)
- `tsconfig.main.json` - Main process (CommonJS modules, Node.js compatibility)

### Security Model

- Context isolation enabled
- Node integration disabled in renderer
- Limited API surface via preload script
- All IPC communication uses invoke/handle pattern

## Component Architecture

### Vue 3 Patterns Used

- Composition API with `<script setup>`
- Reactive state management via `ref()` and `computed()`
- Watchers for side effects (e.g., date changes reload data)
- Single-file components with scoped styles

### State Management Approach

No external store used. State organized as:

- **Categories**: List of task categories with CRUD operations
- **Task Records**: Daily task list with inline editing
- **UI State**: Loading states, modals, form visibility
- **Date Navigation**: Selected date with computed formatting
- **Settings**: Theme preferences and target work hours (persisted in localStorage)

### Key UI Patterns

- **Inline Editing**: Double-click table cells to edit directly
- **Inline Task Entry**: Always-visible add task form as last table row with Enter key support
- **Custom Dropdowns**: Styled category selectors for both inline editing and task creation
- **Special Task Buttons**: Dedicated "Pause" and "End" buttons for quick task entry
- **Loading States**: Comprehensive loading indicators for all async operations
- **Toast Notifications**: Success/error feedback system
- **Modal Management**: Setup modal for categories, theme, and target work hours settings
- **Date Navigation**: Previous/next day buttons, today button, date picker
- **Report Visualization**: Daily summaries with category breakdowns and task summarization

## Report Component

### Daily Report Features

The Daily Report provides comprehensive analysis of standard tasks only:

- **Smart Duration Calculation**: Uses ALL records (including special tasks) as time boundaries for accurate standard task durations
- **Task Summarization**: Groups tasks with identical names, showing occurrence count (e.g., "3x") and combined duration
- **Task Ordering**: Tasks within each category are ordered by first occurrence time
- **Category Breakdown**: Shows time distribution across categories with progress bars and percentages
- **Status Indicators**: Visual feedback with emojis:
  - **⚠️** Warning emoji when day lacks an "End" task (not finalized)
  - **😊** Happy face emoji when reaching configured target work hours
- **Configurable Target**: Target work hours setting in Setup (default: 8 hours, range: 1-24 hours)

### Report Calculation Logic

Duration calculation correctly handles mixed task types with special logic for the last task of each day:

```typescript
// Uses ALL records for boundaries, aggregates only standard tasks
const allSortedRecords = taskRecords.filter(record => record.start_time)
    .sort((a, b) => parseTimeString(a.start_time) - parseTimeString(b.start_time))

// For each standard task, calculate duration
for (const standardRecord of standardRecords) {
  const currentIndex = allSortedRecords.findIndex(record => record.id === standardRecord.id)
  
  // If NOT the last task, use next task as boundary
  if (currentIndex < allSortedRecords.length - 1) {
    const nextRecord = allSortedRecords[currentIndex + 1]
    // Calculate duration using any next task as boundary
  } else {
    // Last task duration logic based on date context:
    // - Past days: duration until midnight (end of day)
    // - Today: duration until current time (0 if start time is future)
    // - Future days: duration is always 0
  }
}
```

**Duration Rounding Policy**: To prevent 1-minute mismatches between individual task durations and report totals, all duration calculations use a consistent rounding strategy:

1. **Parse time with seconds precision**: `parseTimeString()` converts time to fractional minutes (includes seconds/60)
2. **Floor individual task minutes**: Each task's duration is floored to whole minutes before display/summation  
3. **Sum floored values**: Report totals sum the individual floored minutes rather than flooring the final sum
4. **Consistent application**: `calculateDuration()`, `getTotalMinutesTracked()`, and `getCategoryBreakdown()` all use `Math.floor()` per-task before aggregation

This policy is fully implemented in App.vue - all three functions apply `Math.floor()` to individual task durations before summing or display, ensuring report totals exactly match the sum of individual task durations in the left panel.

### Auto-Refresh Functionality

For today's tasks, the application automatically refreshes duration calculations every 15 seconds:

- **Auto-refresh Scope**: Only active when viewing today's date
- **Refresh Interval**: 15 seconds for real-time duration updates
- **Consistency**: Both task list and daily report refresh simultaneously
- **Lifecycle Management**: Auto-refresh starts/stops when switching dates, properly cleaned up on component unmount

The auto-refresh ensures that ongoing tasks show current duration without requiring manual page refresh.

### Report Styling

- **Gradient Text Effects**: Section headers use CSS gradient backgrounds with text clipping
- **Emoji Styling**: Status emojis have dedicated `.status-emoji` class to override gradient effects
- **Responsive Layout**: Category sections with collapsible task summaries
- **Progress Indicators**: Visual progress bars for category time distribution

## Design System

### Color Palette (CSS Custom Properties)

- `--verdigris: #57bdaf`
- `--mantis: #59c964`
- `--asparagus: #69966f`
- `--emerald: #56b372`
- `--aero: #1fbff0`

### Design Principles

- **Compact Design**: All components must be space-efficient
- **Consistent Color Palette**: Always use defined app colors, never external colors
- **Green Theme**: Delete operations use green instead of traditional red
- **Minimal Window Size**: 1050x750 pixels minimum to ensure UI usability

## Settings & Configuration

### Setup Modal

The setup modal (⚙️ gear icon) provides centralized configuration:

- **Theme Settings**: Light, Dark, or Auto (follows system preference)
- **Target Work Hours**: Configurable daily target (1-24 hours, 0.5 increments, default: 8)
- **Category Management**: Add, edit, delete, and set default categories

### Persistent Settings

Settings are stored in localStorage with automatic restoration:

```typescript
// Theme preference
localStorage.setItem('theme', currentTheme.value)

// Target work hours
localStorage.setItem('targetWorkHours', targetWorkHours.value.toString())

// Loaded on app startup with validation
const savedTargetHours = localStorage.getItem('targetWorkHours')
if (savedTargetHours) {
  const hours = parseFloat(savedTargetHours)
  if (!isNaN(hours) && hours > 0 && hours <= 24) {
    targetWorkHours.value = hours
  }
}
```

### Window Configuration

Main window settings in `src/main/main.ts`:

- **Default Size**: 1200x800 pixels
- **Minimum Size**: 1050x750 pixels (prevents UI breaking)
- **Security**: Context isolation enabled, node integration disabled

## Development Patterns

### Error Handling

- Comprehensive try-catch in all IPC handlers
- User-friendly error messages via toast system
- Graceful fallbacks when API unavailable
- Automatic data reload on error for state consistency

### Data Validation

- Category name uniqueness enforced at database level
- Input sanitization with trim() and existence checks
- Default category protection (cannot delete default)
- Time format validation for task start times

### Form Interaction Patterns

- Enter key submits forms
- Escape key cancels editing
- Auto-focus on form inputs
- Blur events save inline edits

### Testing

No test configuration currently exists in the project.

## Key Files to Understand

1. `src/renderer/App.vue` - Main UI component (1000+ lines, contains all frontend logic)
2. `src/main/database.ts` - Database service layer with all CRUD operations
3. `src/main/main.ts` - Electron main process with IPC handlers
4. `src/shared/types.ts` - Type definitions with runtime constants, immutable constraints, and centralized UI configuration
5. `package.json` - Build scripts and dependency management

## Common Development Tasks

When adding new database operations:

1. Add method to DatabaseService (`src/main/database.ts`)
2. Add IPC handler in main process (`src/main/main.ts`)
3. Expose method in preload script (`src/main/preload.ts`)
4. Add TypeScript type to ElectronAPI interface (`src/shared/types.ts`)
5. Use method in Vue component via `window.electronAPI`

When working with task types:

- Use `TASK_TYPES` constant for runtime validation, loops, or UI generation
- Use `SPECIAL_TASK_TYPES` constant for special task logic and guards
- Use `DURATION_VISIBLE_BY_TASK_TYPE[taskType]` for duration display decisions  
- Use `TaskRecordInsert` for creation operations (includes task_type)
- Use `TaskRecordUpdate` for modification operations (excludes immutable task_type)

When adding new UI features:

- Follow existing reactive patterns in App.vue
- Use CSS custom properties for colors
- Add loading states for async operations
- Include error handling with toast notifications
- Maintain compact design philosophy

When working with auto-refresh functionality:

- Auto-refresh only activates when viewing today's date (`isToday(selectedDate.value)`)
- Use `startAutoRefresh()` and `stopAutoRefresh()` to manage intervals
- Clean up intervals in component lifecycle (`onUnmounted`)
- Trigger reactivity updates with `taskRecords.value = [...taskRecords.value]`
- Auto-refresh affects both task list durations and daily report calculations

**Midnight Rollover Behavior**: When users keep the app open past midnight, the auto-refresh interval will naturally stop updating because the `isToday(selectedDate.value)` guard prevents updates once today becomes yesterday. To handle midnight transitions properly, consider calling `stopAutoRefresh()` at midnight or re-evaluating `isToday()` and restarting via `startAutoRefresh()` when appropriate. Always ensure `onUnmounted` cleanup is still required for proper resource management. This prevents lingering timers and ensures daily report calculations switch correctly at midnight.

When working with report calculations:

- Use ALL records for duration boundaries, not just standard tasks
- Ensure report totals match left panel task durations
- Consider special tasks (pause, end) as valid time endpoints
- Use `getTotalMinutesTracked()` for comparing against target work hours
- Apply `.status-emoji` class to emojis in gradient text contexts
- Use the `getLastTaskEndTime(taskDate: string, taskStartTime: number): number` helper for date-aware last task logic:
  - **Contract**: Returns end time in minutes for the last task based on date context
  - **Past days**: Returns 1440 (midnight) for any start time
  - **Today**: Returns current time in minutes, or start time if start is in future
  - **Future days**: Returns start time (creating zero duration)
  - **DRY principle**: This helper is used by all three duration functions to prevent logic duplication
  - **Testing**: Manual test available in `test-helper.js` covering past/today/future edge cases

When adding new settings:

- Add reactive state variables for current and temporary values
- Update `openSetup()` to initialize temp values
- Update `saveSettings()` to persist to localStorage
- Add validation in `onMounted()` for saved values
- Include appropriate UI controls in setup modal

## Markdown Formatting Notes

When editing markdown files, always ensure proper markdown formatting:

- **List Spacing**: Always include blank lines before and after list blocks to avoid MD032 violations
- **Consistent Indentation**: Use consistent spacing for nested list items
- **Line Endings**: File must end with a single newline character
