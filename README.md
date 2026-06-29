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
(see [`docs/spec.md`](docs/spec.md)). To populate it from a source of your own, a committed,
**config-driven acquire CLI** (`scripts/acquire.ts` + a generic example config) caches a
source's raw data locally, and a small **private adapter** maps that raw shape onto the
schema. So **no provider-specific code or data is ever committed** — your source's config,
adapter, and recipes all stay local. The repo ships only fictional **demo** recipes so you
can see the shape of things. Fittingly for an agent-built app, an **agent playbook**
([`scripts/ACQUIRE.md`](scripts/ACQUIRE.md)) walks Claude Code through acquiring from your
chosen source, end to end.

## How this was built

Forkast is an experiment in **agent-first, no-hand-coding development**: every line
here was written by **Claude Opus 4.8** (via Claude Code), pair-designed through
conversation rather than typed by hand. It's partly a learning exercise — seeing
how far a spec-first, build-together dialogue can actually go — and partly just
pragmatic: I'd rather shape an app than hand-crank a weekly shopping list. 🙂

## Status

🚧 Early days — see [`docs/spec.md`](docs/spec.md) for the full design and the MVP scope,
[`docs/decisions.md`](docs/decisions.md) for how it got here.

## Licence

MIT (see [`LICENSE`](LICENSE)).
