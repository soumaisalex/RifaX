# Rifa X — Genesis

This repository contains the initial monorepo foundation for Rifa X.

## Workspace

- `apps/web` — public and administrative web application.
- `apps/api` — Hono API running on Cloudflare Workers.
- `packages/database` — Drizzle/Neon database layer.

## First endpoint

`GET /api/health`

## Security

Secrets are intentionally excluded from the repository. Neon credentials and Cloudflare secrets will be configured through environment variables/secrets.

Tudo por Alex Passos
