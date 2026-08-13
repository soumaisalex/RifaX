# Deploy do Rifa X no Cloudflare

A arquitetura de produção é separada em dois serviços:

- **Web:** Cloudflare Pages, gerado por `pnpm --filter @rifa-x/web build` e publicado a partir de `apps/web/dist`.
- **API:** Cloudflare Workers, usando `apps/api/wrangler.toml`.
- **Banco:** Neon/PostgreSQL, acessado pelo Worker por `DATABASE_URL`.

## GitHub Actions

Os workflows de deploy estão em:

- `.github/workflows/deploy-web.yml`
- `.github/workflows/deploy-api.yml`

Eles executam somente após push em `main` ou manualmente via `workflow_dispatch`.

## Variáveis/secrets necessários no GitHub

Secrets:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

Variable de repositório:

- `CLOUDFLARE_PAGES_PROJECT` — nome exato do projeto criado no Cloudflare Pages.

## Secrets necessários no Worker

Configurar no Cloudflare, fora do Git:

- `DATABASE_URL`
- `SESSION_SECRET`

O arquivo `apps/api/wrangler.toml` já documenta esses secrets.

## Ordem do primeiro deploy

1. Criar o projeto Pages no Cloudflare e definir `CLOUDFLARE_PAGES_PROJECT`.
2. Configurar `CLOUDFLARE_API_TOKEN` e `CLOUDFLARE_ACCOUNT_ID` no GitHub.
3. Fazer o primeiro deploy da API Worker.
4. Configurar `DATABASE_URL` e `SESSION_SECRET` no Worker.
5. Fazer o primeiro deploy do Pages.
6. Validar `/api/health`, login administrativo, criação de rifa, números e confirmação Pix.

## Observação importante

O frontend atualmente utiliza caminhos `/api/...`. Portanto, antes do primeiro domínio público definitivo, a API precisa ficar acessível pelo mesmo host/origem ou deverá ser introduzida uma camada explícita de proxy/base URL. Essa integração será validada na etapa de publicação final para evitar um frontend publicado apontando para uma API inacessível.
