---
name: forkast-design
description: Use this skill to generate well-branded interfaces and assets for Forkast — the local-first meal planner — either for production or throwaway prototypes/mocks. Contains the Fresh Organic design guidelines, colour/type/spacing tokens, fonts, assets, and a UI-kit of React components for prototyping the app's screens (Browse, Recipe, Curate, Plan, Shop).
user-invocable: true
---

Read the `readme.md` file within this skill first — it holds the product context,
content voice, visual foundations and iconography. Then explore the other files:

- `styles.css` + `tokens/` — the design tokens (colours, type, spacing, radius,
  shadow) and dark mode. Consumers link `styles.css`; everything is a `--fk-*`
  custom property, so always style against the semantic aliases (e.g. `--fk-brand`,
  `--fk-surface-card`, `--fk-text-muted`), not the raw ramps.
- `components/` — reusable React primitives (Button, IconButton, SegmentedControl,
  Input, Select, Checkbox, Tag, Chip, RecipeCard, Panel, EmptyState, ListRow,
  RatingScale/StarRating/RotationRating, NavTabs). Each has a `.d.ts` props
  contract and a `.prompt.md` usage note.
- `ui_kits/app/` — an interactive recreation of the Forkast planner; the best
  reference for how the pieces compose into real screens.
- `assets/` — the brand mark and demo recipe images.

If creating visual artifacts (mocks, throwaway prototypes, slides), copy assets out
and produce static HTML files that link `styles.css` and use the token variables.
If working on production code, copy the tokens/components and follow the rules here
to design as an expert in the Forkast brand — the app is React 19 + Tailwind v4, so
these tokens can be wired into a Tailwind `@theme` block.

If the user invokes this skill without other guidance, ask what they want to build,
ask a few focused questions, and act as an expert designer who outputs HTML
artifacts _or_ production code, depending on the need. Keep the voice British,
sentence-case and dry-witted; use colour sparingly and semantically; keep corners
soft and imagery food-forward.
