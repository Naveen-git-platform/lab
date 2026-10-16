# WorkPulse

**Make work add up.** WorkPulse is a small, local-first work memory assistant that helps people turn scattered thoughts into tasks, follow-ups, notes, and timesheet-ready summaries.

## What works today

- Capture tasks, follow-ups, and notes with project, date, due date, and minutes spent.
- See an overview of open work, overdue follow-ups, time captured, and a weekly progress bar.
- Mark entries complete, edit them, search across your workspace, and filter tasks.
- Build a seven-day timesheet grouped by date and project.
- Copy a plain-text work summary or export detailed timesheet entries to CSV.
- Export and restore a JSON backup.
- Responsive layout with mobile navigation and keyboard shortcuts (`N` to capture, `/` to search, `Esc` to close dialogs).
- Optional browser speech recognition where supported; microphone permission is requested by the browser.
- No external AI key, database, account, or paid API is needed for the current release.

## Run locally

This is a static HTML/CSS/JavaScript application. No build process or package install is required.

1. Download or clone the repository.
2. Open `index.html` in a browser, or serve the directory with a local HTTP server:

   ```bash
   python -m http.server 4173
   ```

3. Visit `http://localhost:4173`.

A secure context (HTTPS or localhost) is normally required for the browser's speech-recognition API.

## Data and privacy

Entries are stored in browser `localStorage` on the device being used. That is intentionally simple for a first release, but it also means data does **not** sync between browsers/devices and can be lost when site data is cleared. Download a JSON backup before switching devices or clearing browser data. The initial first-visit workspace contains example entries so the screens are useful immediately; delete or edit those examples as needed.

WorkPulse does not upload entries to a server. The current release's suggestions are basic keyword hints, not an AI model. CSV and JSON exports are created in the browser.

## Deploy to GitHub Pages

The repository includes a GitHub Actions workflow that validates the app and publishes it to GitHub Pages on every push to `main`. On the first setup, a repository owner may need to visit **Settings → Pages** and select **GitHub Actions** as the build and deployment source. The connected GitHub app in this development session cannot change repository Pages settings itself. After the source is enabled, rerun the **Validate and deploy WorkPulse** workflow from the Actions tab or push a new commit. The intended address is `https://naveen-git-platform.github.io/lab/` once the deployment completes.

## Suggested next milestone

Add optional authenticated sync using Supabase, then add an opt-in LLM integration for converting free-form voice/text into structured tasks. Keep all API keys server-side, offer an offline/manual path, and require confirmation before sending messages or changing third-party systems.

## Project structure

- `index.html` — accessible app layout and dialogs
- `styles.css` — responsive user interface
- `app.js` — local data model, rendering, capture, search, timesheet, export/restore

## License

MIT
