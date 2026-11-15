# Veteranos GCO

Web app for the Ginásio Clube Olhanense veterans' basketball practices: attendance, balanced teams, a live scoreboard and the season ranking.

Live: https://rfjm.github.io/VeteranosGCO-v2/

This is a redesign of [VeteranosGCO](https://github.com/rfjm/VeteranosGCO). It talks to the **same Supabase project**, with the same tables and queries; only the interface changed.

## What changed from v1

- GCO visual identity: crest, club green, condensed sports type, dark court theme.
- Mobile-first navigation: bottom tab bar on phones, top nav on desktop.
- Home dashboard with the season top 5, MVP of the month and recent trainings.
- Ranking podium, mobile ranking cards, and a cleaner desktop table.
- Player search and sorting, attendance progress bars.
- Training page: calendar shows completed vs open trainings, opens today's training automatically, searchable attendance checklist with the 18-player limit and waitlist visible live, sticky action bar.
- Scoreboard: duration presets, clearer clock (turns red in the last 10 s), larger tap targets, tap the score to add a point, space bar to start or pause.
- Confirmation dialogs before destructive or irreversible actions (delete training, regenerate teams, reset game, finish training) and toasts instead of browser alerts.

## Development

```bash
npm install
npm run dev
npm test
```

## Deploy

```bash
npm run deploy
```

Builds into `dist/` and publishes it to the `gh-pages` branch.

## Database

`supabase/migrations/` is a copy of the original repository's history, for reference only. This repository does not apply migrations.
