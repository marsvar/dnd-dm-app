# Monster Art Generator Pipeline

This folder contains a local, provider-agnostic pipeline for creating monster portraits and tokens.
It does not run AI generation inside the app. The scripts here only prepare manifests and file
structure so you can swap providers later.

## Folder Layout

- `schemas/` JSON Schemas for prompts and manifests
- `data/` Prompt input files
- `scripts/` Node + TypeScript scripts
- `output/` Local outputs (ignored by git)
  - `portraits/` Generated portrait images
  - `tokens/` Generated token images
  - `manifests/` Generated job manifests

## Quick Start

1) Create or edit prompts

```
tools/art-generator/data/monster-prompts.json
```

If you are starting fresh, copy the sample file:

```
cp tools/art-generator/data/monster-prompts.sample.json tools/art-generator/data/monster-prompts.json
```

Optional: build prompts from structured definitions (style-locked system):

```
cp tools/art-generator/data/monster-definitions.sample.json tools/art-generator/data/monster-definitions.json
node --experimental-strip-types tools/art-generator/scripts/build-prompts.ts \
  --input tools/art-generator/data/monster-definitions.json \
  --out tools/art-generator/data/monster-prompts.json
```

2) Build a portrait generation manifest

```
node --experimental-strip-types tools/art-generator/scripts/generate-manifest.ts \
  --input tools/art-generator/data/monster-prompts.json \
  --out tools/art-generator/output/manifests/portrait-manifest.json
```

3) Generate portraits with your preferred provider

- Use the manifest file to queue jobs in your provider of choice.
- Place the resulting images in `tools/art-generator/output/portraits/`.

4) Build a token manifest from portraits

```
node --experimental-strip-types tools/art-generator/scripts/prepare-token-manifest.ts \
  --in tools/art-generator/output/manifests/portrait-manifest.json \
  --out tools/art-generator/output/manifests/token-manifest.json
```

5) Generate tokens using your preferred tool

- Use the token manifest to drive your token pipeline.
- Place results in `tools/art-generator/output/tokens/`.

6) Optional: Sync to app public folders

```
node --experimental-strip-types tools/art-generator/scripts/sync-to-public.ts --dry-run
node --experimental-strip-types tools/art-generator/scripts/sync-to-public.ts
```

This copies matching files into:
- `public/monsters/`
- `public/tokens/`

## Validation

Validate prompt input:

```
node --experimental-strip-types tools/art-generator/scripts/validate-prompts.ts \
  tools/art-generator/data/monster-prompts.json
```

Validate structured monster definitions (builds prompts first):

```
node --experimental-strip-types tools/art-generator/scripts/validate-definitions.ts \
  --input tools/art-generator/data/monster-definitions.json
node --experimental-strip-types tools/art-generator/scripts/build-prompts.ts \
  --input tools/art-generator/data/monster-definitions.json \
  --out tools/art-generator/data/monster-prompts.json
node --experimental-strip-types tools/art-generator/scripts/validate-prompts.ts \
  tools/art-generator/data/monster-prompts.json
```

Strict mode (requires monsterId, blocks legacy id):

```
node --experimental-strip-types tools/art-generator/scripts/validate-definitions.ts \
  --input tools/art-generator/data/monster-definitions.json \
  --strict
```

Validate manifests (portrait, token, or both + cross-checks):

```
node --experimental-strip-types tools/art-generator/scripts/validate-manifests.ts \
  --portrait tools/art-generator/output/manifests/portrait-manifest.json \
  --token tools/art-generator/output/manifests/token-manifest.json
```

Validate asset registry:

```
node --experimental-strip-types tools/art-generator/scripts/validate-registry.ts \
  tools/art-generator/output/registry/asset-registry.json
```

Review (approve/reject) registry entries:

```
node --experimental-strip-types tools/art-generator/scripts/review-registry.ts \
  --id goblin-scout \
  --status approved \
  --reason "Ready for use"
```

```
node --experimental-strip-types tools/art-generator/scripts/review-registry.ts \
  --ids goblin-scout,skeletal-warrior \
  --status rejected \
  --reason "Needs more contrast"
```

## Asset Registry Workflow

The registry tracks approved assets while outputs remain local:
- `monsterId`
- `portraitPath`
- `tokenPath`
- `generationStatus` (pending/generated/failed)
- `approvalStatus` (pending/approved/rejected)

Build a registry from manifests:

```
node --experimental-strip-types tools/art-generator/scripts/build-registry.ts \
  --portrait tools/art-generator/output/manifests/portrait-manifest.json \
  --token tools/art-generator/output/manifests/token-manifest.json \
  --out tools/art-generator/output/registry/asset-registry.json
```

Sample registry file:

```
tools/art-generator/data/asset-registry.sample.json
```

## Design Note: Sync Only Approved (Future)

Future follow-up idea: a `sync-approved.ts` script that reads the registry, filters
items with `approvalStatus: approved`, then copies only those files into
`public/monsters/` and `public/tokens/`. That keeps unreviewed assets local while
providing a clean handoff to the app.

## Provider Notes

The scripts are provider-agnostic. A provider should only need:
- A prompt string
- Output settings (size, format)
- A place to store the resulting files

To integrate a provider later, add a script in `scripts/` that:
1) Reads a manifest
2) Executes jobs
3) Updates item `status` + `artifact` fields

## Schemas

- `schemas/monster-prompt.schema.json` describes the prompt shape
- `schemas/generation-manifest.schema.json` describes manifest items and status
- `schemas/asset-registry.schema.json` describes the registry format

## Style-Locked Prompt System

Config files:
- `data/styles/bestiary-style.json` global art direction
- `data/styles/species-traits.json` species traits
- `data/styles/role-traits.json` role traits
- `data/styles/mood-traits.json` mood traits

Structured monster definitions:
- `data/monster-definitions.sample.json`

Build prompts:

```
node --experimental-strip-types tools/art-generator/scripts/build-prompts.ts \
  --input tools/art-generator/data/monster-definitions.json \
  --out tools/art-generator/data/monster-prompts.json
```

Manual overrides:
- Use `promptOverride` / `negativePromptOverride` in a monster definition to bypass composition.

## Draw Things Evaluation (Portrait-First)

This is a manual, local-only bake-off focused on portrait quality and style consistency.
No tokens or registry steps are required until portraits pass.

Inputs:
- `data/monster-definitions.drawthings.json`
  - Uses `seedMonsters` IDs from `app/lib/data/srd.ts` for direct mapping.

Flow (locked settings across all 5 monsters):
1) Validate definitions

```
node --experimental-strip-types tools/art-generator/scripts/validate-definitions.ts \
  --input tools/art-generator/data/monster-definitions.drawthings.json
```

2) Build prompts

```
node --experimental-strip-types tools/art-generator/scripts/build-prompts.ts \
  --input tools/art-generator/data/monster-definitions.drawthings.json \
  --out tools/art-generator/data/monster-prompts.drawthings.json
```

3) Validate prompts

```
node --experimental-strip-types tools/art-generator/scripts/validate-prompts.ts \
  tools/art-generator/data/monster-prompts.drawthings.json
```

4) Generate portrait manifest

```
node --experimental-strip-types tools/art-generator/scripts/generate-manifest.ts \
  --input tools/art-generator/data/monster-prompts.drawthings.json \
  --out tools/art-generator/output/manifests/portrait-manifest.drawthings.json
```

5) Manual Draw Things generation (portraits only)
- Use identical model, sampler, steps, guidance, and background expectations
- Vary only prompt content and seed per candidate

Naming convention for portrait variants:
- `monsterId__v1.png`
- `monsterId__v2.png`
- `monsterId__v3.png`
- `monsterId__v4.png`

Place exports in:
- `tools/art-generator/output/portraits/`

6) Manual review of portrait outputs
- Only after portraits meet quality and consistency targets should the token/registry flow be used for this path.

## Nano Banana Evaluation (Portrait-First)

This uses the AI Studio REST endpoint with your API key. Keep it local-only and portrait-first.

Environment:
- `GEMINI_API_KEY` must be set in your shell

Flow (locked settings across all 5 monsters):
1) Validate definitions

```
node --experimental-strip-types tools/art-generator/scripts/validate-definitions.ts \
  --input tools/art-generator/data/monster-definitions.drawthings.json
```

2) Build prompts

```
node --experimental-strip-types tools/art-generator/scripts/build-prompts.ts \
  --input tools/art-generator/data/monster-definitions.drawthings.json \
  --out tools/art-generator/data/monster-prompts.drawthings.json
```

3) Validate prompts

```
node --experimental-strip-types tools/art-generator/scripts/validate-prompts.ts \
  tools/art-generator/data/monster-prompts.drawthings.json
```

4) Generate portraits (Nano Banana)

```
node --experimental-strip-types tools/art-generator/scripts/generate-portraits-nanobanana.ts \
  --input tools/art-generator/data/monster-prompts.drawthings.json \
  --out tools/art-generator/output/portraits \
  --results tools/art-generator/output/portraits/nanobanana-results.json \
  --system tools/art-generator/data/styles/nanobanana-system.txt \
  --candidates 4 \
  --aspect 2:3 \
  --size 512
```

Naming convention for portrait variants:
- `monsterId__v1.png`
- `monsterId__v2.png`
- `monsterId__v3.png`
- `monsterId__v4.png`

5) Manual review of portrait outputs
- Only after portraits meet quality and consistency targets should the token/registry flow be used for this path.

## Approved Import (Portraits Only)

Use this once you have reviewed and approved a single portrait per monster in the registry.
Only image files are copied into `public/monsters/` and each monster gets one portrait.

Build the registry (if needed):

```
node --experimental-strip-types tools/art-generator/scripts/build-registry.ts \
  --portrait tools/art-generator/output/manifests/portrait-manifest.drawthings.json \
  --token tools/art-generator/output/manifests/token-manifest.json \
  --out tools/art-generator/output/registry/asset-registry.json
```

Approve a portrait:

```
node --experimental-strip-types tools/art-generator/scripts/review-registry.ts \
  --id mon-goblin \
  --status approved \
  --reason "Primary portrait"
```

Sync approved portraits only:

```
node --experimental-strip-types tools/art-generator/scripts/sync-approved.ts --dry-run
node --experimental-strip-types tools/art-generator/scripts/sync-approved.ts
```

Design note (future): a `migrate-definition-ids.ts` helper could convert legacy `id` fields
to `monsterId`, optionally checking for collisions. Not implemented yet.
