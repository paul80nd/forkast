# Forkast Design System

A design system for **Forkast** — an opinionated, local-first **meal planner**.
Curate a personal recipe collection with ★ ratings, plan a varied week, and
generate one merged shopping list. Everything runs in the browser (IndexedDB);
nothing leaves the user's machine.

This system replaces Forkast's earlier generic look with a **Fresh Organic**
visual direction: warm-paper neutrals, a garden-green brand, honey stars, and a
cool harbour blue for "proposals". It is built to slot straight into the app's
existing screens.

> **Not a generic recipe manager.** Forkast is built around one household's
> specific workflow — triage-rate everything, plan for variety, shop once. The
> design language should feel calm, confident and food-forward, never busy.

## Sources this was built from

- **Codebase:** local folder `forkast/` (React 19 · Vite · TypeScript · Tailwind
  v4 · Dexie/IndexedDB · HashRouter · Vitest). The design system was authored by
  reading the real screens, components and schema — not screenshots.
  - Screens (`src/pages/`): `BrowsePage`, `RecipePage`, `CuratePage`, `PlanPage`,
    `ShopPage`, `RefinePage`, `ConfigPage`.
  - Components (`src/components/`): `RecipeCard`, `RecipeDetail`, `RecipeModal`,
    `RatingScale`, `CompareView`, `VariantsTab`, `ImportDataset`, `BackupRestore`,
    `BackupNudge`, `ThemeToggle`.
  - Schema (`src/schema/`): `recipe.ts`, `userData.ts` — the provider-neutral
    storage format.
  - Vocabulary (`src/lib/curation.ts`): the household star/rotation labels.
- **Demo content:** `public/demo/recipes.json` + six gradient recipe images
  (copied into `assets/recipes/`). Fictional demo data only — the app's privacy
  firewall keeps real recipes local.

## Product surfaces

One product: the Forkast SPA. A centred column (max **1024px**) with a top nav of
six tabs — **Browse · Refine · Curate · Plan · Shop · Config** — plus a Recipe
detail view. Fully responsive: on narrow screens the nav drops to its own
full-width scrolling row. Light **and** dark mode (class-based `.dark` on `<html>`,
already wired in the app).

---

## CONTENT FUNDAMENTALS

How Forkast writes. The voice is a **calm, dry-witted household member** — plain,
warm, a little opinionated, never marketing-y.

- **Casing:** Sentence case everywhere — page titles, buttons, labels. Short
  ALL-CAPS eyebrow labels (with wide tracking) mark sub-sections: `INGREDIENTS`,
  `METHOD`, `YOUR RATING`, `STORE CUPBOARD`.
- **Person:** Addresses the user as **you / your** ("your favourites", "your
  week", "your rating"). First-person plural for the household intent ("what are
  we cooking?").
- **British English:** *favourites, flavour, aisle, tin, courgette.* Keep it.
- **Tone examples (verbatim from the app):**
  - Empty states are gently encouraging, never scolding: *"Nothing planned yet —
    add meals from your shortlist below."* · *"All triaged 🎉"*
  - Star verdicts are the household's own blunt vocabulary: **★5 Yum Yum · ★4
    Like it · ★3 I'd eat it · ★2 Rather not · ★1 Yuk.**
  - Rotation (how often): **On repeat · Often · Now & then · Occasionally ·
    Rarely.**
  - Micro-copy is terse and honest: *"A proposal — reroll, lock, or swap any, then
    accept. Nothing's added yet."*
- **Numbers & units:** Compact and glanceable — `25 min`, `Serves 4`, `★4+`,
  `≤ 30 min`, `from 3 recipes`. Metric units. Time shown with a clock glyph.
- **Emoji:** Used **sparingly and functionally**, never decoratively — a single
  🎉 on a "you're done" empty state; the fork 🍴 beside the wordmark. Do not
  sprinkle emoji through body copy or headings.

---

## VISUAL FOUNDATIONS

**Palette — Fresh Organic.** Warm-paper neutrals carry the whole UI; colour is
used sparingly and always semantically. Every value is `oklch` (see
`tokens/colors.css`). Always style against the **semantic aliases**, not the raw
ramps.

- **Neutral (warm paper → ink):** page background is `--fk-surface-page` (near-
  white with a whisper of green-yellow warmth); cards are pure white
  (`--fk-surface-card`); ink text is `--fk-neutral-900`. Slightly warm greys, low
  chroma — never a cold blue-grey.
- **Green = the brand** (`--fk-brand`, hue ~150). Primary buttons, active nav,
  links (`--fk-brand-ink`), focus ring. Replaces the old orange entirely.
- **Green tints = confirmed/positive** — "In week", "Cooked" use
  `--fk-positive-tint` bg + `--fk-positive-ink` text.
- **Honey (`--fk-star`, hue ~75)** — quality **★ stars** and gentle warnings
  ("cooked recently", "check these" shop lines).
- **Harbour blue (`--fk-info`, hue ~240)** — **proposals**: the suggested-week
  panel, the rotation **◆** scale, "why" reason tags. Deliberately cool, so a
  suggestion never looks like a committed/brand action.
- **Rose (`--fk-danger`, hue ~22)** — destructive only (delete, unbind).

**Typography.** Display = **Bricolage Grotesque** (characterful grotesque, set
tight, `--fk-tracking-display`) for the wordmark, page titles and card titles.
Body/UI = **Figtree** (clean, friendly, legible small). Mono = system mono, used
*only* for the parsed ingredient breakdown (`320 g · chicken thighs`). Headings
are semibold (600); nothing lighter than 400. Scale in `tokens/typography.css`.

**Spacing & layout.** 4px base scale. The app is a single centred **1024px**
column with 16px gutters. Comfortable-but-efficient density: list rows ~10px
vertical padding, cards 12px, big panels 16px. Generous 16–24px gaps between
sections.

**Corner radii.** Soft and rounded — the Fresh Organic signature. Chips 6px,
buttons/inputs 10px, recipe cards & list rows 14px, images 18px, big feature
panels 24px, pills/badges/avatars full. Nothing sharp.

**Cards.** White surface, 1px `--fk-border` hairline, `--fk-radius-lg`,
`--fk-shadow-sm`. Recipe cards lift on hover: `translateY(-2px)` +
`--fk-shadow-md` over `--fk-duration` with `--fk-ease`. Big proposal/summary
panels use a coloured **wash** background (`--fk-info-wash`, `--fk-brand-wash`)
with a matching 1px tinted border and `--fk-radius-2xl`.

**Backgrounds & imagery.** No gradients on chrome, no textures, no hero photos in
the UI itself. Recipe imagery is square-ish (**4:3**), `object-fit: cover`,
rounded. The demo images are simple two-stop green gradients with a food emoji +
title — real imports carry photos. Placeholder art in this system uses subtle
diagonal-stripe fills with a mono caption, never invented photography.

**Motion.** Restrained and soft. Hover lifts and colour changes over 150ms with
`--fk-ease`; larger panels 240ms. No bounces, no attention-seeking animation.

**States.**
- *Hover:* surfaces get a subtle sunken tint (`--fk-surface-sunken`); brand fills
  darken to `--fk-brand-hover`; cards lift.
- *Active/press:* colour deepens (no shrink).
- *Focus:* `--fk-shadow-focus` ring (3px `--fk-ring`) + brand border on inputs.
- *Selected:* brand border + brand ring (recipe multi-select).
- *Disabled:* 50% opacity, no pointer.

**Borders & dividers.** 1px hairlines only: `--fk-border` around cards/inputs,
`--fk-divider` between list rows (a lighter tone). No heavy or coloured borders
except the coloured washes on feature panels.

---

## ICONOGRAPHY

Forkast's icon language is **two deliberate registers**, both carried over from
the app — keep them distinct:

1. **Line icons (UI chrome):** thin, rounded **stroke** icons at `stroke-width:2`,
   `stroke-linecap/linejoin: round`, ~20–24px (the app hand-rolls these, e.g. the
   sun/moon theme toggle). This system uses **[Lucide](https://lucide.dev)** (same
   stroke weight & rounded joins) via CDN as the canonical set — search, settings,
   chevrons, plus, x, calendar, etc. *Substitution flagged:* the app's inline SVGs
   were not extracted; Lucide is the closest match and should be adopted going
   forward.
2. **Functional glyphs (domain semantics):** the app leans on a small, meaningful
   set of Unicode glyphs as *content*, not decoration — keep these literal:
   - **★** quality rating (honey) · **◆** rotation/how-often (harbour)
   - **⇄** dish has other versions · **⏱** cooking time
   - **✓** cooked / in week · **✕** remove · **▾** menu · **↻** reroll
   - **🔒 / 🔓** lock a suggested slot · **←  →** navigate · **+** add
   - **🍴** brand fork (beside the wordmark) · **🎉** one-off "you're done"

**Emoji** appear only in these functional spots and inside demo recipe art —
never as generic bullets or in prose.

**Logo.** Forkast ships only a placeholder mark: the letter **F** in a rounded
square (`assets/forkast-original.svg`, orange). There is no full logo. This system
provides a recoloured green version (`assets/forkast-mark.svg`) matching the new
brand, and otherwise renders the wordmark **Forkast** in Bricolage Grotesque. No
new logo was invented.

---

## Index / manifest

- **`styles.css`** — the one file non-Tailwind consumers link. `@import` manifest only.
- **`tailwind-theme.css`** — Tailwind v4 bridge. Maps every `--fk-*` token to
  utilities via `@theme inline`, so `.dark` re-themes all utilities automatically.
  In a Tailwind app import THIS instead of `styles.css`.
- **`tokens/`** — `colors.css`, `typography.css`, `spacing.css` (all custom
  properties; dark mode lives in `colors.css`).
- **`assets/`** — `forkast-mark.svg` (green), `forkast-original.svg` (orange
  placeholder), `recipes/*.svg` (six demo images).
- **`components/`** — reusable React primitives, grouped by concern. Each has a
  sibling `.d.ts` (props contract) and `.prompt.md` (usage):
  - `core/` — **Button** (+ **SplitButton**), **IconButton**, **SegmentedControl**
  - `forms/` — **Input**, **Select**, **Checkbox**
  - `display/` — **Tag**, **Chip**, **RecipeCard**, **Panel**, **EmptyState**, **ListRow**
  - `rating/` — **RatingScale** + **StarRating** / **RotationRating** presets
  - `navigation/` — **NavTabs**
  - _Starting points:_ `Button`, `RatingScale` and the `RecipeCard` are marked as
    seedable starting points.
- **`ui_kits/app/`** — interactive recreation of the Forkast planner in the new
  direction (`index.html` + `app.jsx` + `data.js`): Browse, Recipe, Curate, Plan
  and Shop, with a working light/dark toggle. See its `README.md`.
- Foundation specimen cards live in `foundations/` and populate the **Design
  System** tab (grouped Type · Colours · Spacing · Brand), alongside one
  **Components** card per component group and the app under **Forkast App**.
- **`SKILL.md`** — lets this system be used as a downloadable Agent Skill.

## Intentional additions

The app hand-rolls its primitives inline rather than exposing a named component
library, so this system names and factors that vocabulary for reuse. Everything
here has a direct counterpart in the app's screens — nothing invented. The only
consolidations worth flagging: **ListRow** unifies the near-identical planned-meal /
shopping / rated rows; **Panel** unifies the coloured wash blocks (suggested week,
versions, summaries); **Tag** vs **Chip** splits static labels from selectable pills.
