# WorkPulse

**Make work add up.** WorkPulse is a lightweight productivity workspace for turning scattered work notes into actionable tasks, follow-ups, project notes, and timesheet-ready summaries.

[![Validate WorkPulse](https://github.com/Naveen-git-platform/lab/actions/workflows/deploy.yml/badge.svg?branch=main)](https://github.com/Naveen-git-platform/lab/actions/workflows/deploy.yml)
[![Live app](https://img.shields.io/badge/demo-live%20on%20Vercel-6877f5)](https://workpulse-eight-amber.vercel.app/)

- **Live demo:** https://workpulse-eight-amber.vercel.app/
- **Source code:** https://github.com/Naveen-git-platform/lab
- **Issues:** https://github.com/Naveen-git-platform/lab/issues
- **License:** MIT

> **Important prototype note:** WorkPulse currently uses browser-local storage. The welcome page creates a local profile, not a secure cloud account. There is no password authentication, email verification, multi-user backend, or cross-device sync in this release. Do not use it as a secure shared client workspace until authentication and server-side data isolation are implemented.

## Contents

- [Why WorkPulse](#why-workpulse)
- [Features](#features)
- [New user walkthrough](#new-user-walkthrough)
- [Run locally](#run-locally)
- [Project structure](#project-structure)
- [How data is stored](#how-data-is-stored)
- [Security and privacy](#security-and-privacy)
- [Testing and quality checks](#testing-and-quality-checks)
- [Deployment](#deployment)
- [Current limitations](#current-limitations)
- [Roadmap](#roadmap)
- [Open-source references worth studying](#open-source-references-worth-studying)
- [Contributing](#contributing)
- [License](#license)

## Why WorkPulse

Client and project work often gets scattered across chat messages, personal notes, reminders, and timesheets. WorkPulse puts a simple capture-and-review loop in one place:

1. Capture what happened or what needs to happen.
2. Associate it with a project or client.
3. Record the work date and minutes spent.
4. Track completion and follow-ups.
5. Review the week and export a timesheet summary.

The goal is to reduce forgotten follow-ups and make end-of-week reporting less painful without requiring a paid API or a complicated setup.

## Features

### Work capture and task management
- Create tasks, follow-ups, and notes from one quick-capture form.
- Add a project/client, work date, due date, and minutes spent.
- Edit, delete, complete, and reopen entries.
- Search across saved entries and filter task lists.
- Identify overdue follow-ups and review daily work.
- Optional browser speech recognition where the browser supports it and permission is granted.

### Productivity overview
- Dashboard cards for open tasks, follow-ups, time captured, and weekly activity.
- A seven-day strip to review work by date.
- Quick actions for capturing tasks, follow-ups, and opening the timesheet.
- Responsive navigation for desktop and mobile layouts.

### Timesheets and exports
- Review work grouped by date and project.
- Copy a plain-text weekly summary.
- Export entries to CSV for use in spreadsheet or timesheet workflows.
- Export and restore a JSON backup. Restoring adds imported entries rather than replacing existing ones.

### First-run onboarding
- **Create local workspace:** stores a display name and optional email in this browser and starts with a clean workspace for new visitors.
- **Explore with sample data:** opens a demo workspace containing example entries.
- Existing saved work is retained when the app is updated.
- Keyboard shortcuts: `N` opens quick capture, `/` focuses search, and `Esc` closes dialogs.

### Interface polish
- Responsive layout, subtle entry and welcome transitions, hover states, and visible keyboard focus.
- Honors `prefers-reduced-motion` to avoid non-essential animation for users who request reduced motion.
- No external font, animation, or component runtime is required by the current static app.

## New user walkthrough

1. Visit the [live demo](https://workpulse-eight-amber.vercel.app/).
2. Choose **Explore with sample data** to preview immediately, or enter a name and optionally an email to create a local profile.
3. Select **Capture work** or **+ New entry**.
4. Write the task or note, choose Task / Follow-up / Note, and add a project, date, due date, or minutes as useful.
5. Save the entry. Open **My tasks** or **Follow-ups** to review it, edit it, or mark it complete.
6. Open **Timesheet** at the end of the week, review the summary, and copy the text or export CSV.
7. Use **Backup & restore** before changing browsers/devices or clearing browser data.

## Run locally

### Requirements
- A modern browser (current Chrome, Edge, Firefox, or Safari recommended).
- Python 3 if you want to serve the files locally; or any static file server.
- Node.js 22+ only if you want to run the JavaScript syntax check used by CI.

No package install, build step, API key, or paid service is required for the current release.

### Option A: open the page
Download or clone the repository, then open `index.html` in your browser. For best compatibility with speech recognition, use HTTPS or localhost.

### Option B: use a local HTTP server

```bash
git clone https://github.com/Naveen-git-platform/lab.git
cd lab
python -m http.server 4173
```

Open http://localhost:4173 in your browser.

### Validate the JavaScript

```bash
node --check app.js
```

The GitHub Actions workflow also runs HTML structure and required-feature smoke checks.

## Project structure

```text
.
├── index.html                  # App shell, welcome flow, entry and backup dialogs
├── styles.css                  # Responsive design system, interaction states, motion
├── app.js                      # Local data model, UI rendering, capture, search, timesheets
├── vercel.json                 # Static hosting configuration
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Actions validation workflow
├── .gitignore
└── README.md
```

## How data is stored

The current release stores information in the browser's `localStorage`:

- `workpulse.entries.v1` — tasks, follow-ups, notes, dates, completion status, and time.
- `workpulse.profile.v1` — local display name, optional email, and onboarding mode.

This is intentionally simple and local-first. Data is not uploaded to WorkPulse servers. Browser-local data is isolated by browser profile and origin; it does not automatically sync between browsers or devices.

**Protect your data:** download a JSON backup before clearing site data, changing devices, or using a different browser. A browser reset or storage eviction can remove local data. Do not store passwords, access tokens, confidential customer details, or regulated data in this prototype.

## Security and privacy

- The current welcome form is **not authentication**. It does not create an online account or verify email.
- There is no backend database, access-control layer, or server-side user isolation in this release.
- The app does not need an API key and does not call an LLM provider.
- Speech recognition is optional and handled by browser capabilities; browser vendors may process voice input according to their own service and privacy policies.
- CSV/JSON exports are generated in the browser.
- If you add a backend, never put service-role secrets in frontend code or commit secrets to GitHub.

### Requirements before real client/team use

Before inviting clients or using the app for shared business data, implement and test:

1. Real sign-up/sign-in, email verification, and password reset through a trusted auth provider.
2. A server-side database with per-user or per-organization ownership.
3. Row-level security and authorization tests for every user-owned table.
4. A clear privacy policy, retention/deletion flow, and backup/export plan.
5. Input validation, secure environment variables, dependency scanning, and error monitoring.
6. Explicit separation of personal workspaces and client/team workspaces.

## Testing and quality checks

GitHub Actions runs when code is pushed to `main`, a pull request targets `main`, or a workflow is manually started. It currently checks:

- JavaScript syntax with Node.js.
- Duplicate HTML IDs and required app elements.
- Links to the expected JavaScript and stylesheet files.
- Presence of key app features and responsive CSS.

Run the same basic JavaScript check locally with `node --check app.js`.

These are smoke checks, not a substitute for full browser-based end-to-end tests. Manual QA should cover new-user onboarding, sample mode, creating/editing/deleting/completing entries, search and filters, weekly navigation, CSV export, JSON backup/restore, mobile layouts, keyboard navigation, and reduced-motion settings.

## Deployment

The production app is hosted on Vercel:

https://workpulse-eight-amber.vercel.app/

The repository contains a GitHub Actions validation workflow. GitHub Pages publishing is not configured because the connected GitHub integration did not have permission to create a Pages site. Vercel is the intended production host.

If a push does not appear on the live site, check the Vercel project's Git integration and latest production deployment before assuming the deployment updated.

## Current limitations

- No real account authentication or cloud sync.
- Data is stored only in the current browser/device.
- Keyword-based hints are simple rules, not AI-generated suggestions.
- No shared teams, assignments, notifications, calendar integration, or external project-management sync.
- The timesheet is a productivity aid; review entries before submitting them to an employer or client.
- Speech-to-text support depends on the browser and may not be available everywhere.

## Roadmap

Suggested next steps, ordered by impact:

1. **Real auth and sync:** add Supabase Auth and Postgres with row-level security, plus a migration and test plan.
2. **Client/project model:** dedicated project/client records, project filters, and clearer client-level weekly summaries.
3. **Task workflow:** priority, status, tags, recurring tasks, and better due-date handling.
4. **Browser E2E tests:** Playwright tests for onboarding, capture, editing, backup/restore, and timesheet export.
5. **Accessible interaction audit:** keyboard-only testing, screen-reader labels, focus management, and reduced-motion checks.
6. **Optional AI assistance:** only after the data model is stable; make AI opt-in, keep keys server-side, disclose provider processing, and require user confirmation before applying suggestions.
7. **Team collaboration:** organization workspaces, roles, assignments, audit trail, and explicit tenant-isolation tests.

## Open-source references worth studying

These repositories are **reference projects**, not bundled dependencies. Review their current licenses, maintenance activity, security posture, and fit before copying code or forking. No external repository has been forked automatically.

| Project | Why it is useful | Link |
|---|---|---|
| shadcn/ui | Accessible, customizable UI components and design-system patterns for a future React migration | https://github.com/shadcn-ui/ui |
| Motiq | Motion-aware product UI components with accessibility and reduced-motion considerations | https://github.com/RMahammad/motiq |
| Productivity Dashboard | Task-priority, status, filtering, and dashboard ideas | https://github.com/Geethanjanreddy/productivity-dashboard |
| Tasker | Local-first planning, inbox, upcoming and overdue workflow ideas | https://github.com/Dalvelac/Tasker |
| Personal Dashboard | Lightweight productivity features such as focus sessions, habits, and notes | https://github.com/hemendra-opensource/Personal_Dashboard |

For UI inspiration, prioritize reusable patterns and interaction ideas rather than copying an entire codebase. Keep attribution and license notices for any source code you reuse. Check the upstream repository's current license before forking or incorporating it.

## Contributing

1. Open an issue describing the bug or improvement.
2. Create a focused feature branch.
3. Make the smallest coherent change.
4. Run `node --check app.js` and test the affected flow in a browser.
5. Open a pull request with the problem, solution, test evidence, and screenshots where useful.

Keep the app usable without paid APIs. Any future AI feature should be optional and should not block basic task capture, timesheets, or exports.

## License

This project is distributed under the MIT License. See [LICENSE](./LICENSE).
