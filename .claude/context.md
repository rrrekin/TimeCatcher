# TimeCatcher - Time Tracking App

## Project Overview

Desktop time tracking application for recording task context switches and calculating daily time spent on specific
tasks.

Every task has a defined category. Categories are editable in the setup. By default there are 3 categories:

- Development
- Meeting
- Maintenance

Main screen has:

- On top, a time navigation bar: '<' button to go to the previous day, 'Today' button to set the date to the current day,
  '>' button to go to the next day, and then a date picker to display the selected date and pick any date directly. On the right end of the navigation bar there is a button to open the setup modal. 
- On the left side:
  - There is an editable chronological list of task switching events for the selected day consisting of:
    - the task category (dropdown based on configured list of categories)
    - task name (with the ability to select one of the last X (configurable - by default 15, most recent first) tasks
    - time of switching to the specific task (if left empty, it is automatically filled with the current time)
  - Each task entry also has a button to create a new entry of that task with the current time.
  - Below are buttons to insert 2 specific tasks that do not have any category:
    - `Pause` for adding periods of not working on any task
    - `End` to mark the end of the working day, and complete the period of the last started task
- On the right is a constantly updated daily time report for the selected day:
  - Report date
  - List of tasks, per category, chronologically with total time spent.

## Tech Stack

- **Framework**: Electron + Vue 3 + TypeScript
- **Database**: SQLite with better-sqlite3
- **Settings**: electron-store
- **Build**: Vite
- **IDE**: WebStorm

## Key Requirements

- Local-only storage (no cloud)
- Dark/light theme with system auto-switching
- Task switching records
- Daily time calculations
- Simple, clean UI
- Compact design

## Project Structure

```
src/
├── main/           # Electron main process
├── renderer/       # Vue frontend
└── shared/         # Shared types
```

## Color palette
```css
/* CSS HEX */
--verdigris: #57bdafff;
--mantis: #59c964ff;
--asparagus: #69966fff;
--emerald: #56b372ff;
--aero: #1fbff0ff;

/* CSS HSL */
--verdigris: hsla(172, 44%, 54%, 1);
--mantis: hsla(126, 51%, 57%, 1);
--asparagus: hsla(128, 18%, 50%, 1);
--emerald: hsla(138, 38%, 52%, 1);
--aero: hsla(194, 87%, 53%, 1);

/* SCSS HEX */
$verdigris: #57bdafff;
$mantis: #59c964ff;
$asparagus: #69966fff;
$emerald: #56b372ff;
$aero: #1fbff0ff;

/* SCSS HSL */
$verdigris: hsla(172, 44%, 54%, 1);
$mantis: hsla(126, 51%, 57%, 1);
$asparagus: hsla(128, 18%, 50%, 1);
$emerald: hsla(138, 38%, 52%, 1);
$aero: hsla(194, 87%, 53%, 1);

/* SCSS RGB */
$verdigris: rgba(87, 189, 175, 1);
$mantis: rgba(89, 201, 100, 1);
$asparagus: rgba(105, 150, 111, 1);
$emerald: rgba(86, 179, 114, 1);
$aero: rgba(31, 191, 240, 1);

/* SCSS Gradient */
$gradient-top: linear-gradient(0deg, #57bdafff, #59c964ff, #69966fff, #56b372ff, #1fbff0ff);
$gradient-right: linear-gradient(90deg, #57bdafff, #59c964ff, #69966fff, #56b372ff, #1fbff0ff);
$gradient-bottom: linear-gradient(180deg, #57bdafff, #59c964ff, #69966fff, #56b372ff, #1fbff0ff);
$gradient-left: linear-gradient(270deg, #57bdafff, #59c964ff, #69966fff, #56b372ff, #1fbff0ff);
$gradient-top-right: linear-gradient(45deg, #57bdafff, #59c964ff, #69966fff, #56b372ff, #1fbff0ff);
$gradient-bottom-right: linear-gradient(135deg, #57bdafff, #59c964ff, #69966fff, #56b372ff, #1fbff0ff);
$gradient-top-left: linear-gradient(225deg, #57bdafff, #59c964ff, #69966fff, #56b372ff, #1fbff0ff);
$gradient-bottom-left: linear-gradient(315deg, #57bdafff, #59c964ff, #69966fff, #56b372ff, #1fbff0ff);
$gradient-radial: radial-gradient(#57bdafff, #59c964ff, #69966fff, #56b372ff, #1fbff0ff);
```

## Current Status

### Completed
- ✅ Project structure created
- ✅ Dependencies installed  
- ✅ Configuration files set up
- ✅ Electron main process implemented
- ✅ Basic Vue 3 + TypeScript setup
- ✅ Vite development environment configured
- ✅ Project color palette applied throughout UI
- ✅ Time navigation bar fully implemented
  - Previous/Next day navigation buttons
  - Today button to jump to current date
  - Date picker for direct date selection
  - Setup button for opening configuration modal
- ✅ Compact design optimized for small windows
- ✅ Responsive sidebar navigation (Dashboard, Time Tracking, Projects, Reports, Settings)
- ✅ Modern UI with gradient effects and smooth transitions

### In Progress
- Main screen layout with task switching interface
- Left panel for chronological task entries
- Right panel for daily time reports
- SQLite database integration
- Task category management

### Next Steps
1. Implement main screen layout as specified:
   - Left side: Editable chronological list of task switching events
   - Right side: Daily time report with categorized task summaries
2. Add SQLite database layer for data persistence
3. Implement task category system with default categories (Development, Meeting, Maintenance)
4. Build task entry forms with dropdowns and auto-completion
5. Create time calculation engine for daily reports
6. Add setup modal for configuration management
7. Implement dark/light theme switching