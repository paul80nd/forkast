# Forkast 🍴🔮

**An opinionated, local-first meal planner.** Curate a personal collection of
recipes, plan a varied week, and generate a merged shopping list — all in your
browser, with nothing leaving your machine.

> ⚠️ **This is not a generic recipe manager.** Forkast is built around one fussy
> household's very specific workflow and tastes. It's shared in case the approach
> — or the simple, portable recipe **storage format** — is useful to you. If you
> want a general tool, **go vibe your own.** 🙂

## What it does

- **Curate** recipes with a ★1–5 rating that means something specific:
  ★5 favourite · ★4 nice · ★3 *only for variety* · ★1–2 binned · unrated = triage.
- **Plan a week** of meals, scaled to however many you're cooking for.
- **Shop** — a single merged, aisle-grouped shopping list across the week, with
  store-cupboard basics kept separate.
- **Local-first** — runs entirely in your browser (IndexedDB). No server, no
  account, no cloud.

## Bring your own recipes

Forkast is **generic-input by design**. It reads a simple, documented JSON schema
(see [`SPEC.md`](SPEC.md)) and a generic `schema.org/Recipe` importer for many
recipe sites. **Provider-specific adapters are not shipped** — point your own at
whatever source you like. The repo ships only fictional **demo** recipes so you
can see the shape of things.

## Status

🚧 Early days — see [`SPEC.md`](SPEC.md) for the full design and the MVP scope.

## Licence

MIT (see [`LICENSE`](LICENSE)).
