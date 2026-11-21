# Repository Conventions

These conventions apply to everyone (including coding agents) changing this repository.

## UI

- Do not zero-pad numbers in labels or copy: write `1`, `2`, `3`, never `01`, `02`, `03`.
- Render sequential steps as labels joined by arrow icons, not numbered badges.
- User-facing copy belongs in both `packages/landing/src/content.ts` locales (`en` and `zh`)
  and in `apps/web/messages/*.json` where the surface uses next-intl.

## Documentation

- Docs are bilingual: `docs/<name>.md` is Simplified Chinese and `docs/<name>.en.md` is
  English. Change both.
- Provider documentation lives in `docs/providers.md` and `docs/providers.en.md`. Describe
  new video, planner, vision or storage backends there rather than adding provider sections
  to other documents.
- Register a new document in `DOCUMENTS` in `scripts/build_pages.py`, then rebuild the
  embedded pages with `python3 scripts/build_pages.py` (regenerates
  `apps/web/public/docs/`).

## Secrets

- Credentials only come from environment variables. `.env` is gitignored; `.env.example`
  keeps empty placeholders and comments.
- Never commit API keys, tokens, OSS/S3 credentials, CLI session files, or fixtures that
  contain real values.

## Quality gates

- Backend: `cd services/api && uv run pytest && uv run ruff check src tests && uv run mypy src`.
- Frontend: `pnpm --dir apps/web test && pnpm --dir apps/web typecheck && pnpm --dir apps/web build`.
