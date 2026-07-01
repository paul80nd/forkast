# Acquiring a recipe source — agent playbook

A runbook for an agent (e.g. Claude Code) to populate `data/private/` from a recipe
source of the user's choosing, ending in the state Pass 2 (transform/import) expects.
Hand it to your agent with: *"Import recipes from &lt;service&gt; using
`scripts/ACQUIRE.md`."*

It is deliberately **generic** — it names no provider. The provider-specific bits
(URLs, field paths, the raw data) all land in `data/private/` and a `*.private.json`
config, which are gitignored. Keep it that way (see the firewall + politeness rules at
the foot of this file).

The end state you're driving toward:

```
data/private/
  sitemap-recipes.xml        # raw enumeration, for provenance
  recipe-slugs.json          # every slug + any free metadata (categories) from URLs
  acquire-slugs.txt          # the CURATED pull list (one slug per line) ← Pass 1 input
  <source>.private.json      # the per-source config (copied from the example)
  MAPPING-NOTES.md           # source → Forkast Recipe field map (for Pass 2)
  raw/<slug>.json            # verbatim cached source payloads
  images/<slug>.<ext>        # one image per recipe
```

---

## 0. Ask the user first

- **Which service / source?** Get the site.
- **Permission & politeness.** Confirm this is personal, non-commercial use; you'll
  rate-limit and respect `robots.txt`; the data is never committed.
- **Curation rules.** What should be excluded outright (allergens, dislikes — e.g. a
  household no-go like fish), and roughly how big a library they want. You'll use these
  in Phase 3.

## 1. Find the recipe list

- Read `https://<site>/robots.txt` and look for `Sitemap:` lines.
- Fetch the sitemap. It's often a **sitemap index** → follow the child that holds
  recipes (frequently a CMS/API host, which hints at a clean JSON endpoint for Phase 2).
- Identify the **recipe URL pattern** (e.g. `/recipes/<slug>`) and extract `<slug>`s.
  Other paths (category landing pages, `/<category>/<slug>` duplicates) are not new
  recipes — **dedupe by slug**, but harvest those category path segments as *free
  metadata* (a slug → categories map; great for curation and no-go filtering).
- Save the raw sitemap to `data/private/sitemap-recipes.xml` and the parsed list to
  `data/private/recipe-slugs.json` (`[{ slug, categories: [...] }, ...]`).

> **⚠ A sitemap can be a *curated subset*, not the full catalogue.** Don't trust it as
> exhaustive. It may list only "current/featured" items while the API still serves many
> more (often older ones). **Verify:** pick a recipe you know exists (browse the site) and
> check it's in your slug list — if it isn't, the sitemap is lying about coverage.
>
> **The reliable complete list is usually the site's own browse/listing API** — the JSON
> endpoint behind the category pages' "load more" button. It paginates, typically
> `…/recipes?category=<all>&limit=<n>&offset=<m>`: walk `offset` in steps of `limit` until a
> page comes back empty. Watch for (a) the pagination param name (`offset` vs `skip` vs
> `page` — try each; a param the server ignores returns the *same* first page every time),
> and (b) a `limit` ceiling (too-large values may 5xx). There's usually a catch-all category
> (e.g. `recipes`/"All") that returns everything; dedupe by slug across pages. If an
> **id-keyed** recipe endpoint exists you can enumerate by id instead, but most are
> slug-keyed only.
>
> Treat the sitemap as a fast first cut and the browse API as the source of truth — diff the
> two; the gap is real recipes you'd otherwise miss.

## 2. Learn the shape (one sample)

- Fetch **one** recipe. Prefer a JSON API if the source has one; otherwise fetch the
  page and read its `schema.org/Recipe` **JSON-LD**. Save it under `data/private/raw/`.
- Map its fields onto Forkast's `Recipe` schema (`src/schema/recipe.ts`). Write the
  mapping + gotchas to `data/private/MAPPING-NOTES.md`. Watch for:
  - the **envelope** — where the recipe object actually sits (e.g. `data.entry`, or the
    JSON-LD `@graph`);
  - fields that are **objects/arrays-of-objects, not strings** (cuisine, categories,
    allergens) — note the sub-key to pluck;
  - where **images** live and what widths exist (pick one nearest a target width);
  - the **ingredient line format** — usually one combined string (`"320g chicken
    thighs"`); splitting qty/unit/name is Pass 2's job, but record the field name;
  - anything **missing** (e.g. no `slug` in the payload — carry it from the request).

## 3. Curate the pull list

- Start from `recipe-slugs.json`. Apply the user's **exclusions** (allergen/dislike
  keywords, excluded categories) and **interests** (proteins, cuisines, dish types,
  max prep time). Slugs are descriptive — keyword filtering on them goes a long way.
- Iterate **with the user**: apply rules, report the resulting count + a sample, adjust.
- Write the final list to `data/private/acquire-slugs.txt`, one slug per line
  (`#` comments allowed). This is the acquire input — keep it; re-running only fetches
  what's new.

## 4. Configure the source

- Copy `scripts/source.config.example.json` → `data/private/<source>.private.json`.
- Fill it in (only the `recipeApiUrl` and `image.path` are really source-specific):

  ```jsonc
  {
    "name": "<source>",
    "acquire": {
      "recipeApiUrl": "https://api.<site>/recipe/{slug}",   // {slug} is substituted
      "rawDir": "data/private/raw",
      "imageDir": "data/private/images",
      "image": { "path": "data.entry.media.images", "urlField": "image",
                 "widthField": "width", "preferWidth": 600 },
      "rateLimitMs": 1500,
      "userAgent": "Mozilla/5.0 (personal recipe import; non-commercial)"
    }
  }
  ```

## 5. Acquire

- **Test small first** — shape bugs are cheap to catch on 3 recipes:

  ```bash
  node scripts/acquire.ts --config data/private/<source>.private.json \
    --slugs data/private/acquire-slugs.txt --limit 3
  ```

- Verify `data/private/raw/*.json` and `data/private/images/*` look right (open an
  image; confirm it's the expected resolution). If images didn't land, your
  `image.path` is probably pointing at the wrong node — fix and re-run (it retries
  missing images without re-downloading JSON).
- **Full run** at a polite rate. For a large list, run it in the background and agree
  the `rateLimitMs` with the user first (e.g. ~1–1.5s ≈ courteous). It's idempotent —
  safe to stop and resume.

You're now ready for **Pass 2 (transform/import)**: the raw cache + `MAPPING-NOTES.md`
are everything that step needs.

---

## Always

- **Privacy firewall.** Provider URLs, field paths, and any fetched data stay in
  `data/private/` + `*.private.json` (gitignored). Committed code/config names no
  provider. The committed dictionary + schema are generic knowledge and stay public.
- **Politeness.** Personal, non-commercial use only. Rate-limit, respect `robots.txt`,
  fetch each recipe once (cache + skip), and never commit the scraped data.
