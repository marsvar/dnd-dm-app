# DnD DM App

A DM-first tool for running live D&D 5e sessions (theatre-of-the-mind). Built for speed and reliability at the table — the kind you'd trust with 6 players and a noisy room.

## What it does

- **Campaigns** — organise sessions, track party members across encounters
- **Encounter builder** — assemble encounters from the SRD bestiary; add monsters with average or rolled HP
- **Combat tracker** — event-driven initiative order, HP tracking, conditions, death saves, inspiration, undo
- **Notes & log** — session notes and an auto-generated combat event log
- **Player companion** — PIN-gated player access with full character sheet editing, skill/save/ability display, and a live encounter view during combat

All game data is stored locally in your browser (`localStorage`) and synced to the cloud when signed in.

## Who it's for

Dungeon Masters running tabletop D&D sessions who want a fast, reliable digital tracker without the cognitive overhead of a full virtual tabletop.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Sign up or log in with email and password. On first load you'll choose your role (DM or Player). DM tools require an account; players join via a shareable link.

## Other commands

```bash
npm run build   # production build
npm run lint    # lint check
npm test        # run tests
```

## Architecture

See [CLAUDE.md](./CLAUDE.md) for full architecture details, design system, and development conventions.

The roadmap is in [docs/ROADMAP.md](./docs/ROADMAP.md).

## Tech stack

- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS v4
- Supabase (auth + cloud sync)
- Zustand (client state)
- Radix UI (dialogs)
- lucide-react (icons)
- localStorage + Supabase `user_app_state` for persistence

## Content

Monster and rules data is sourced from the D&D 5e Systems Reference Document (SRD). No copyrighted content from core rulebooks.
