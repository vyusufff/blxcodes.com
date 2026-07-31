# Adding games at scale

Each game is one JSON file in `src/content/games/`:

```text
src/content/games/{slug}.json
```

Example slug: `blox-fruits.json` → URL `/codes/blox-fruits`

## Schema

```json
{
  "title": "Game Name Codes (Month Year)",
  "gameName": "Game Name",
  "description": "Short SEO description.",
  "updatedAt": "2026-07-29",
  "featured": false,
  "howTo": ["Step 1", "Step 2"],
  "faq": [{ "q": "…", "a": "…" }],
  "codes": [
    { "code": "EXAMPLE", "reward": "Reward text", "status": "active" }
  ]
}
```

`status` must be `active` or `expired`.

## Why JSON (not MDX)

- Faster to bulk-generate and validate
- One file = one game (git-friendly for thousands)
- Typed Zod schema in `src/content.config.ts`
- Hub is paginated (`GAMES_PER_PAGE` in `src/lib/games.ts`)

## Next scale step

When updates become too heavy for git/static builds, swap the loader behind `src/lib/games.ts` to Cloudflare D1 / KV without changing page templates.
