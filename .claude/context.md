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

## Current Status

- Project structure created
- Dependencies installed
- Configuration files set up
- Ready for implementation