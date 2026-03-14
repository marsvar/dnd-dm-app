# DnD DM App

A DM-first tool for running live D&D 5e sessions (theatre-of-the-mind). Built for speed and reliability at the table — the kind you'd trust with 6 players and a noisy room.

## What it does

- **Campaigns** — organise sessions, track party members
- **Encounter builder** — add monsters from the SRD bestiary and PCs to encounters
- **Combat tracker** — event-driven initiative order, HP tracking, conditions, undo
- **Notes & log** — session notes and an auto-generated combat event log
- **Player companion** — read-only encounter view for players (DM-gated)

All data is stored locally in your browser (`localStorage`). No account required.

## Who it's for

Dungeon Masters running tabletop D&D sessions who want a fast, reliable digital tracker without the cognitive overhead of a full virtual tabletop.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

On first load you'll land on the role selector. Set a DM PIN to access the DM tools.

## Other commands

```bash
npm run build   # production build
npm run lint    # lint check
npm test        # run tests
```

## Architecture

See [CLAUDE.md](./CLAUDE.md) for full architecture details, design system, and development conventions.

Key decisions are documented in [DECISIONS.md](./DECISIONS.md).

The roadmap is in [docs/ROADMAP.md](./docs/ROADMAP.md).

## Tech stack

- Next.js (App Router)
- TypeScript
- Tailwind CSS
- Radix UI (dialogs)
- lucide-react (icons)
- localStorage for persistence

## Content

Monster and rules data is sourced from the D&D 5e Systems Reference Document (SRD). No copyrighted content from core rulebooks.
