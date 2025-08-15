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
CREATE TABLE categories (id, name UNIQUE, is_default BOOLEAN, created_at)

-- Task records preserve historical category names and support task types
CREATE TABLE task_records (
  id, category_name, task_name, start_time, date, 
  task_type DEFAULT 'normal' CHECK (task_type IN ('normal', 'pause', 'end')),
  created_at
)

-- Unique index to enforce one end task per day
CREATE UNIQUE INDEX idx_end_per_day ON task_records(date) WHERE task_type = 'end'
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

### Key UI Patterns

- **Inline Editing**: Double-click table cells to edit directly
- **Inline Task Entry**: Always-visible add task form as last table row with Enter key support
- **Custom Dropdowns**: Styled category selectors for both inline editing and task creation
- **Special Task Buttons**: Dedicated "Pause" and "End" buttons for quick task entry
- **Loading States**: Comprehensive loading indicators for all async operations
- **Toast Notifications**: Success/error feedback system
- **Modal Management**: Setup modal for categories and theme settings
- **Date Navigation**: Previous/next day buttons, today button, date picker

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