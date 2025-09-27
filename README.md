# TimeCatcher

---

![CodeRabbit Pull Request Reviews](https://img.shields.io/coderabbit/prs/github/rrrekin/TimeCatcher?utm_source=oss&utm_medium=github&utm_campaign=rrrekin%2FTimeCatcher&labelColor=171717&color=FF570A&link=https%3A%2F%2Fcoderabbit.ai&label=CodeRabbit+Reviews)
![License](https://img.shields.io/github/license/rrrekin/TimeCatcher)
![GitHub issues](https://img.shields.io/github/issues/rrrekin/TimeCatcher)
![GitHub last commit](https://img.shields.io/github/last-commit/rrrekin/TimeCatcher)
![GitHub repo size](https://img.shields.io/github/repo-size/rrrekin/TimeCatcher)
![GitHub top language](https://img.shields.io/github/languages/top/rrrekin/TimeCatcher)
[![codecov](https://codecov.io/gh/rrrekin/TimeCatcher/branch/main/graph/badge.svg)](https://app.codecov.io/gh/rrrekin/TimeCatcher)

Context-switch time tracking, my way

## About This Project

This is me trying vibe coding. I’m a senior Java backend dev poking at tech I don’t know at all to see how far AI agents can take me. I mostly played Product Owner — wrote the asks and sanity‑checked the result.

No start/stop timers. You just log what you switched to and when; the app sums time per task from those switches.

## Key Features

- Quick capture of task switches, plus special tasks: `pause` and `end`
- Daily report with dual totals: Actual time and 5‑minute rounded time
- Category breakdowns and task occurrence counts
- Inline editing in the task list with keyboard-friendly listboxes
- Auto-refresh for today’s view; handy status icons
- Accessible UI with ARIA support

Details on calculation and UI behavior are documented in [CLAUDE.md](./CLAUDE.md) under Report and Duration Calculation.

## Downloads

Download the latest release for your platform from the [Releases page](https://github.com/rrrekin/TimeCatcher/releases).

### Mac

- __Download__: `.dmg` installer from the releases page
- __Installation__: Open the `.dmg` file and drag TimeCatcher to your Applications folder
- __First Launch__: The app is unsigned (open source project), so you may need to:
  1. Double-click the "Fix Permissions (if needed)" script in the DMG to automatically resolve Gatekeeper issues
  2. Right-click the app and select "Open" instead of double-clicking
  3. Or go to __System Settings__ → __Privacy & Security__ → scroll down to "Security" section and click "Open Anyway" next to TimeCatcher
  4. Or manually run: `xattr -d com.apple.quarantine /Applications/TimeCatcher.app`

__Future Enhancement__: Homebrew cask installation is planned but not yet available.

### Windows

- __Download__: `.exe` installer or portable version
- __Installation__: Run the installer or extract the portable version

### Linux

- __Download__: `.AppImage` (portable) or `.snap` packages
- __Installation__:
  - AppImage: Make executable and run directly
  - Snap: Install via `sudo snap install timecatcher_*.snap --dangerous`

## Tech Stack

- Electron + Vite for the desktop shell and dev server
- Vue 3 + TypeScript in the renderer
- SQLite storage with a simple, constraint-driven schema
- Vitest with V8 coverage, Codecov reporting
- Prettier + markdownlint, enforced via git hooks

See [CLAUDE.md](./CLAUDE.md) for an architecture overview and component/composable map.

## Development Setup

After cloning the repository:

```bash
# Install dependencies
npm install

# Set up git hooks for automatic markdown formatting
npm run install-hooks

# Start development server
npm run dev
```

For detailed development guidance, see [CLAUDE.md](./CLAUDE.md).  
For git hooks setup and troubleshooting, see [docs/GIT_HOOKS_SETUP.md](./docs/GIT_HOOKS_SETUP.md).

Note for Windows users: run `npm run install-hooks` from Git Bash/WSL (for `cp`/`chmod`), or follow the manual steps in [docs/GIT_HOOKS_SETUP.md](./docs/GIT_HOOKS_SETUP.md).

## Architecture & Data

- Multi-process Electron app: main (Node) + renderer (Vue) + shared types
- IPC bridge with a clean separation between UI and persistence
- Database stores immutable task records (types: `normal`, `pause`, `end`) and category names directly for historical integrity

Schema and IPC APIs are summarized in [CLAUDE.md](./CLAUDE.md).

## CI, Coverage & Versioning

- CI runs tests and build on Node 22 and 24. Coverage collection, threshold enforcement, and Codecov upload run only in the Node 22 job (see `.github/workflows/ci.yml`, gated by `matrix.node-version == 22`).
- Changed-files coverage thresholds enforced: lines 80%, branches 85%, functions 75%, statements 80% (see [docs/BRANCH_PROTECTION_SETUP.md](./docs/BRANCH_PROTECTION_SETUP.md))
- Semantic versioning with an automated “version bump” workflow based on PR titles; details in [docs/VERSIONING.md](./docs/VERSIONING.md)

## Documentation

- Development & architecture notes: [CLAUDE.md](./CLAUDE.md)
- Contributing guidelines: [CONTRIBUTING.md](./CONTRIBUTING.md)
- Git hooks: [docs/GIT_HOOKS_SETUP.md](./docs/GIT_HOOKS_SETUP.md)
- Branch protection and coverage: [docs/BRANCH_PROTECTION_SETUP.md](./docs/BRANCH_PROTECTION_SETUP.md)
- Line endings policy: [docs/LINE_ENDINGS.md](./docs/LINE_ENDINGS.md)
- Versioning workflow: [docs/VERSIONING.md](./docs/VERSIONING.md)
