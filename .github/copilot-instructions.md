# Repo instructions for Copilot / Agents

## Commands
- Dev: npm run dev
- Build: npm run build
- Lint: npm run lint

## Conventions
- Keep domain types in /lib/models/types.ts
- Keep SRD / seed data in /lib/data/srd.ts
- Keep state logic in /lib/store/appStore.tsx (avoid scattered state)
- Keep UI in /components; prefer small components
- `lucide-react` is the approved icon library; use it freely
- `clsx` + `tailwind-merge` are approved; always compose class names via `cn()` from `ui.tsx`
- `@radix-ui/react-dialog` is approved; use the `Dialog`/`DialogContent`/`DialogTitle`/`DialogClose` primitives from `ui.tsx` for all overlays
- Prefer no new packages beyond these; justify any additional dependencies clearly

## What to prioritize
- DX + DM UX (speed, keyboard, clarity)
- Type-safety, predictable state transitions
- Avoid over-engineering

## What to avoid
- Large refactors without tests or clear benefits