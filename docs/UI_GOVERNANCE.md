# UI Governance

> **Scope:** All DM-facing pages and shared components.
> **Priority:** Visual coherence and DM-speed under play conditions. Color scheme governance is a separate, deferred concern.
> **Living document:** Update this file whenever a new pattern is established or an existing rule is relaxed by design decision.

---

## 1. Design intent

This app is used by a DM in real-time during play. Every UI decision must prioritise:

- **Scan speed** — a DM must be able to read the state of an encounter in under 2 seconds.
- **Low-click paths** — primary actions should require no more than one click.
- **Predictability** — the same concept always looks the same page-to-page.
- **Calm aesthetics** — warm parchment tones, restrained typography, no needless chrome.

---

## 2. Design tokens (source of truth: `app/globals.css`)

All color, font, and effect values must reference CSS custom properties. Never hardcode hex or RGB values in component files.

> **Also forbidden:** Tailwind utilities that reference absolute colors as surface backgrounds — `bg-black/5`, `bg-black/10`, `bg-white/60`, `bg-white/80`, etc. These do not adapt to dark mode. Always use `bg-surface`, `bg-surface-strong`, or the `--background` token for surfaces. `border-black/10` is the only permitted `black/*` value, and only for subtle border lines on `Card`-level elements.

### Color tokens

| Token | Light value | Dark value | Intended use |
|---|---|---|---|
| `--background` | `#f7f3ee` | `#0f0c09` | Page background |
| `--foreground` | `#1f1b16` | `#f1e8dc` | Body text, high-contrast labels |
| `--surface` | `#fffaf2` | `#1a1410` | Card and panel backgrounds |
| `--surface-strong` | `#f1e8dc` | `#241c16` | Input fields, nested surfaces |
| `--accent` | `#7a4b1e` | `#e3b36f` | Interactive elements, CTAs |
| `--accent-strong` | `#513010` | `#f7d39b` | Hover/active accent states |
| `--muted` | `#5a4f45` | `#b5a495` | Secondary text, placeholders, nav links |
| `--ring` | `rgba(122,75,30,0.35)` | `rgba(227,179,111,0.3)` | Focus rings on inputs |

### HP state tokens

Used exclusively by the `HpBar` component. Do not reference in page files directly.

| Token pair | Trigger | Light | Dark |
|---|---|---|---|
| `--hp-full` / `--hp-full-bg` | current / max ≥ 75% | `#2d7a3a` / `#d4f0da` | `#6fcf8a` / `#1a3d23` |
| `--hp-mid` / `--hp-mid-bg` | 26–74% | `#8a6200` / `#fdecc8` | `#e8b84d` / `#3a2e0a` |
| `--hp-low` / `--hp-low-bg` | 1–25% | `#b83030` / `#fcd8d8` | `#e87070` / `#3a1515` |
| `--hp-zero` / `--hp-zero-bg` | 0 or max = 0 | `#5a4f45` / `#e8e0d8` | `#b5a495` / `#241c16` |

### Condition chip tokens

| Token | Light | Dark |
|---|---|---|
| `--condition-bg` | `#ede0cf` | `#2e2218` |
| `--condition-fg` | `#5a3a1a` | `#e3b36f` |

Dark mode is handled automatically via `prefers-color-scheme: dark`. Do not use Tailwind's `dark:` variants — use CSS token references only.

### Background treatment
The `body` applies a layered radial-gradient warmth effect plus a fixed `::before` texture overlay. These are intentional and must not be removed or overridden at the page level.

### Typography tokens

| Token | Font | Usage |
|---|---|---|
| `--font-body` | `Alegreya Sans` | All body text, labels, UI copy |
| `--font-display` | `Marcellus` | All `h1`–`h4` headings |
| `--font-mono` | `JetBrains Mono` | Numbers, stats, roll results, code |

Headings (`h1`–`h4`) automatically use `--font-display` via a global CSS rule with `letter-spacing: 0.02em`. Do not override this inline.

---

## 3. Global page layout (source of truth: `app/layout.tsx`)

### Outer chrome
```
<Nav />                                      ← sticky top bar, z-10
<main max-w-6xl px-6 sm:px-8 pt-10 pb-16>   ← single centred column
  {children}                                 ← each page wraps in PageShell
</main>
```

### Nav bar
- `sticky top-0 z-10`, `bg-surface/80 backdrop-blur`, `border-b border-black/5`
- Max width matches `<main>` (`max-w-6xl`)
- Left: wordmark (`DM Toolkit` + `Vault of Encounters`). Right: navigation links.
- Mobile: links are hidden; a plain `Menu` label placeholder occupies the right slot.
- **Do not add icons, avatars, or extra controls to the Nav** — it must remain ambient chrome.

---

## 4. Page-level structure

### `PageShell` (required for every page)
Defined in `app/components/ui.tsx`. Wraps all page content with `space-y-10` vertical rhythm.

```tsx
// app/components/ui.tsx
export const PageShell = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={cx("space-y-10", className)} {...props} />
);
```

- Every top-level page **must** use `PageShell` as its outermost element.
- Do not apply `space-y-*` on the page's root `<div>` directly.
- Use `className` override only for documented exceptions (e.g. the home Dashboard uses `space-y-12` intentionally to add breathing room between hero and content sections).

### Section hierarchy

```
PageShell
└── SectionTitle          ← page/section headline + optional subtitle
    └── Card              ← grouped feature area
        └── [local controls, lists, forms]
```

- `SectionTitle` is the first visible element on every feature page.
- Group logically related controls inside a `Card`.
- Do not nest `Card` inside `Card`.

### Section titles

```tsx
// Signature
<SectionTitle title="Encounter Builder" subtitle="Optional descriptive line." />
```

- `title`: `text-2xl sm:text-3xl font-semibold`, display font, `text-foreground`
- `subtitle`: `text-sm text-muted`, body font
- Bottom margin is owned by the component (`mb-6`). Do not add external top margin.

---

## 5. Shared UI primitives (source of truth: `app/components/ui.tsx`)

All interactive and surface elements must use these primitives unless a documented exception exists. Never create one-off `border/radius/shadow/padding` combinations in page files.

### `Card`
- `rounded-2xl border border-black/10 bg-surface p-5 shadow-[0_12px_30px_rgba(0,0,0,0.08)]`
- Default padding is `p-5`. Override with className only for data-dense contexts.

### `Button`
Three variants — always specify explicitly:

| Variant | Appearance | Use for |
|---|---|---|
| `primary` (default) | `bg-accent text-white rounded-full` | Main CTA per section |
| `outline` | `border border-black/10`, hover accent | Secondary / destructive-adjacent |
| `ghost` | Transparent, `text-muted` | Tertiary, icon-adjacent actions |

### `Input`
- `rounded-xl border border-black/10 bg-surface-strong`, focus: `border-accent ring-2 ring-[--ring]`
- Includes explicit `WebkitTextFillColor` + `caretColor` style overrides for dark-mode autofill.
- Always use this component for text/number inputs — never raw `<input>`.

### `Textarea`
- Same visual contract as `Input`.

### `Pill`
- Compact inline badge for metadata values, tags, and stat summaries.
- `rounded-full`, `text-xs`.
- Three tones — always specify the right one:

| Tone | Appearance | Use for |
|---|---|---|
| `neutral` (default) | `bg-surface-strong font-semibold text-muted` | Feature tags, label badges |
| `accent` | `bg-accent font-semibold text-white` | Highlighted status, active states |
| `stat` | `bg-surface-strong font-mono text-foreground` | Numeric stat values (AC, HP, CR, initiative) |

### `LinkButton`
- Styled like `Button` but renders a `next/link`. Use for in-app navigation CTAs.

### `Select`
- Same visual contract as `Input`: `rounded-xl border border-black/10 bg-surface-strong`, focus ring.
- **Always use this for `<select>` elements.** Never add a raw `<select>` to a page file.

### `FieldLabel`
- Renders the `text-xs uppercase tracking-[0.25em] text-muted` form-label pattern.
- Accepts optional `htmlFor` to associate with an input.
- **Always use this for field labels.** Never inline the class string directly.

### `Checkbox`
- Styled `<input type="checkbox">` with visible focus ring and correct accent color.
- **Never use a raw `<input type="checkbox">` in page files.**

### `Panel`
- A nested surface: `rounded-2xl border border-black/10 bg-surface-strong p-4`.
- Use inside `Card` for sub-sections (e.g. participant rows, form groups).
- Do not use `border-black/5` anywhere — `border-black/10` is the only permitted border opacity for surfaces.

### `HpBar`
- `<HpBar current={n} max={m} />` — a 6px color-coded progress bar.
- Color derives automatically from the ratio using HP state tokens.
- **All HP values in participant rows and PC cards must be accompanied by this component.**
- Never derive or show HP state via custom colors in page files. Use `HpBar`.

### `Dialog` / `DialogContent` / `DialogTitle` / `DialogClose`
- Accessible overlay system built on `@radix-ui/react-dialog`. Handles focus trap, Escape key, click-outside, portal rendering, and ARIA automatically.
- **Never write a hand-rolled `fixed inset-0` overlay.** All modal content must use these primitives.

```tsx
<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent maxWidth="2xl">
    <DialogTitle>Title</DialogTitle>
    {/* … content … */}
    <DialogClose asChild>
      <Button variant="outline">Close</Button>
    </DialogClose>
  </DialogContent>
</Dialog>
```

`DialogTitle` is required for every dialog (renders as a styled `h2`, required for ARIA). `DialogClose` with `asChild` passes close behaviour to any `Button`.

---

## 6. Overlay and panel rules

### Backdrop
- Handled automatically by `DialogContent` — uses `bg-black/15 backdrop-blur-[1px]`.
- **Never** write a custom backdrop div.

### Two panel models

#### Model A — Content-driven panel (most overlays)
Used for: Create Encounter, Add Party, Create Variant, Add Participant, Monster Picker.

```tsx
<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent maxWidth="2xl">
    <DialogTitle>…</DialogTitle>
    {/* content — scrolls internally if taller than viewport */}
  </DialogContent>
</Dialog>
```

`maxWidth` values: `sm` / `md` / `lg` / `xl` / `2xl` (default) / `4xl` / `6xl` / `7xl`.

#### Model B — Full-viewport editor panel
Used for: Edit Encounter, large multi-column live editors that intentionally fill the screen.

```tsx
<Dialog open={!!selectedEncounter} onOpenChange={(open) => { if (!open) close(); }}>
  <DialogContent maxWidth="7xl" fullHeight>
    <header>…</header>
    <div className="mt-4 flex-1 overflow-y-auto">…</div>
  </DialogContent>
</Dialog>
```

`fullHeight` applies `bottom-8 flex flex-col overflow-hidden` to the Content. Scrollable content must use a child div with `flex-1 overflow-y-auto`. The `min-h-0` is inherited from flex context.

### Dismissal
- Radix handles: Escape key, click-outside (pointer-down outside Content bounds).
- Every overlay must still have an explicit visible close button (`DialogClose asChild`).

### Definition of done for overlays
- [ ] Uses `Dialog` + `DialogContent` — no hand-rolled `fixed inset-0` divs.
- [ ] `DialogTitle` present (even if visually matching an existing heading — wrap it).
- [ ] Explicit close button using `DialogClose asChild`.
- [ ] `fullHeight` used for full-viewport editors; default content-driven otherwise.

---

## 7. Participant visual system

### Data model (source of truth: `app/lib/models/types.ts`)

```typescript
export type ParticipantVisual = {
  imageUrl?: string;
  fallback: "initials"; // always present; only value currently supported
};
```

`visual?: ParticipantVisual` is present on `Monster`, `Pc`, and `EncounterParticipant`. Encounter participants carry a snapshot of the visual at build time for runtime stability — changes to source monster/PC visuals do not retroactively affect live combat.

### Normalization
All state entry points normalize visual metadata:
- `appStore.tsx` normalizes on `loadState`, `addMonster`, `addPc`, `addEncounterParticipant`, and `dispatchEncounterEvent`.
- `applyEncounterEvent.ts` normalizes on `PARTICIPANT_ADDED`.
- Normalization is always: `{ fallback: "initials", ...provided }`.

### `ParticipantAvatar` component (source of truth: `app/components/ParticipantAvatar.tsx`)

```tsx
<ParticipantAvatar name={p.name} visual={p.visual} className="..." />
```

Behaviour:
- If `visual.imageUrl` is set → renders `<next/image>` at `64×64` with `alt={name}`.
- Otherwise → renders a `<span aria-hidden>` with two-letter initials derived from the name.
- `?` is used as the initials fallback when the name yields no usable characters.

Rules:
- **Every participant avatar in the app must be rendered via this component.** No page or section may implement its own initials or image logic.
- `className` is the only accepted customisation point (sizing, shape, colour).
- If a new participant surface is added, `ParticipantAvatar` is required on day one.

### Required anatomy for participant rows/cards

Every surface that lists participants must include, in order:

1. `ParticipantAvatar` — identity anchor
2. Name — primary label, truncated on overflow (`truncate min-w-0`)
3. Kind pill — `PC` / `MONSTER` / `NPC` — `text-xs uppercase text-muted`
4. Core combat stats when contextually relevant — `AC`, `HP`, `Initiative` — rendered in `font-mono` using `Pill`

### Image URL data entry
- Both the Monster **Add** form and the Monster inline **Edit** section must expose an `Image URL` field.
- Both the PC **Add** form and the PC inline **Edit** section must expose an `Image URL` field.
- Empty image URL is valid; the initials fallback is always displayed when no URL is present.

---

## 8. Typography and density rules

| Element | Class pattern | Notes |
|---|---|---|
| Page / section heading | `text-2xl sm:text-3xl font-semibold` | Display font applied globally via CSS |
| Sub-section heading | `text-lg font-semibold` | Display font |
| Form field label | `text-xs uppercase tracking-[0.25em] text-muted` | Uppercase only for metadata labels |
| Body / list text | `text-sm text-foreground` | Body font, default weight |
| Secondary / help text | `text-sm text-muted` | Subdued, never critical info |
| Stat / number values | `font-mono text-xs` | Monospace for scannable column alignment |

- **Do not introduce larger font sizes than `text-3xl` inside pages.** Display size is the Nav wordmark only.
- Prefer `text-sm` for all list items, table content, and compact cards.
- `uppercase tracking-widest` is reserved for metadata micro-labels. Do not use for actionable text.

---

## 9. Interaction rules

- Primary DM action (the most frequent action on a screen) must be **one click**.
- Search/filter inputs on list screens must trigger on every keystroke — no submit button.
- Keyboard support is required for all high-frequency list interactions: search → select → add.
- Do not hide required state behind hover-only interactions. Hover is an enhancement, not a gate.
- Destructive actions (`remove`, `delete`) should use the `outline` variant button to signal lower priority vs. a primary CTA.

---

## 10. Definition of done

### Adding or modifying a participant surface
- [ ] `ParticipantAvatar` used for all identity rendering in the changed surface.
- [ ] `visual` propagated correctly from source (`monstersById`, `pcsById`) or defaulted to `{ fallback: "initials" }`.
- [ ] Name truncation (`truncate min-w-0`) applied to prevent overflow.
- [ ] Stats rendered in `font-mono` via `Pill`.
- [ ] Backward compatibility confirmed for persisted state without `visual` field.

### Adding or modifying a page or page section
- [ ] `PageShell` used as outermost page wrapper.
- [ ] `SectionTitle` present for the primary page heading.
- [ ] Content grouped inside `Card` sections.
- [ ] All interactive elements use shared primitives (`Button`, `Input`, `Textarea`, `Pill`).
- [ ] No hardcoded hex/rgb values; only design token references.
- [ ] No `dark:` Tailwind variants; dark mode handled via CSS token switching.
- [ ] Lint passes with zero new errors.
- [ ] Tests pass (and new reducer/state tests added if combat logic was touched).

### Adding or modifying an overlay/modal
- [ ] Backdrop is `bg-black/15 backdrop-blur-[1px]`. No `bg-black/40` or any darker value.
- [ ] **Content-driven panel:** `overflow-y-auto` on backdrop div; no explicit height on panel.
- [ ] **Full-viewport panel:** `h-full flex flex-col` on panel; `min-h-0 flex-1 overflow-y-auto` on scrollable child; no `overflow-y-auto` on backdrop.
- [ ] Panel width is bounded (`max-w-2xl` default; `max-w-xl` for small dialogs; `max-w-6xl/7xl` for complex builders — document any deviation).
- [ ] Clicking backdrop closes the overlay.
- [ ] Visible close button present.
- [ ] No `bg-black/*` or `bg-white/*` utilities used inside panel for any surface element.

---

## 11. What is explicitly deferred

| Topic | Status |
|---|---|
| Color scheme enforcement / dark-mode audit | Deferred — to be addressed in a dedicated color governance pass |
| `SectionCardHeader` shared primitive | Proposed but not yet implemented |
| Mobile nav (hamburger / drawer) | Placeholder exists in Nav; not yet built |
| Avatar upload / local file support | Only URL input supported currently |

---

## 12. Visual language rules

This section defines the visual language for participant surfaces, stat display, and status communication. The core principle: **a DM must be able to read the state of any participant in under 2 seconds without reading prose text.**

### Icons

`lucide-react` is the approved icon library. Use it freely.

- Icons may be used for common affordances: add, remove, confirm, edit, dice, reorder, undo.
- **Icon-only buttons are forbidden.** Every icon button must have either a visible text label or an `aria-label`.
- Prefer icons alongside short text labels for primary actions (e.g. `<Plus size={14} /> Add monster`).
- Do not use icons as the sole means of communicating status — pair with color or a label.

### HP display rules

- **Every HP value shown in a participant row or PC card must be accompanied by an `<HpBar />`.**
- The HP number (current and max) is shown above the bar in `font-mono`.
- Do not show HP in prose form (e.g. "16 / 20") without the bar beneath it.
- Never derive HP color manually in page files. `HpBar` owns all HP-state color logic.

### Condition display rules

- **Conditions must always be rendered as `<ConditionChip />` badges, never as comma-joined text.**
- Condition chips render inline as a wrapping flex row below the participant name.
- Each chip shows the condition name and an `×` dismiss button (if removable).
- In live combat, remove dispatches `CONDITION_REMOVED`. In prep/edit mode, it may mutate directly.
- Condition input fields must use a `<datalist>` sourced from `SRD_CONDITIONS` in `srd.ts`.

### Stat grid layout (participant rows)

Every active-combat participant row must use a minimum 3-column stat grid displaying:

| Column | Label | Display |
|---|---|---|
| 1 | INIT | `font-mono` value or `—` |
| 2 | AC | `font-mono` value or `—` |
| 3 | HP | `font-mono` current + max + `HpBar` |

- `FieldLabel` renders the column header (INIT / AC / HP).
- Stat values use `font-mono` for scannable column alignment.
- Do not include stat values inline in prose descriptions.

### Pill usage for badges

- Use `<Pill tone="stat">` for all numeric stat badges: AC, HP, CR, initiative, speed, level.
- Use `<Pill tone="accent">` for status: LIVE, PREPARING, active turn.
- Use `<Pill tone="neutral">` for category tags: monster type, source (SRD/Custom), kind (PC/Monster/NPC).
- **Never use a hand-rolled `<span>` for stat or status badges.** Always use `<Pill>`.

### Destructive actions

- Destructive actions (`remove`, `delete`, `reset`) must use `variant="outline"`, not `variant="ghost"`.
- Irreversible actions should have an explicit confirmation step (inline confirmation row or UI, not a browser `confirm()` dialog).
