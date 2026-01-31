# Nothing 2 Wear - Hackathon idea

To install dependencies:

```bash
bun install
```

## Environment

Copy `.env.example` to `.env` and set:

- `DATABASE_URL` – Postgres connection string
- `BETTER_AUTH_SECRET` – long random secret for auth
- `BUN_PUBLIC_BETTER_AUTH_URL` – app URL (e.g. `http://localhost:7001`).
- `GEMINI_API_KEY` – (optional) Google Gemini API key for `/api/gemini/health` ping. Get it at [Google AI Studio](https://aistudio.google.com/apikey).

Keep in mind, that everything that starts with `BUN_PUBLIC_` can be used and visible on the client side.

## Run order

1. Make sure that .env is available
2. Start dev environment: `bun run env:up`
3. Apply migrations: `bun run db:migrate`
4. Start dev server: `bun run dev`

This should spin up few services:
* website with api - http://localhost:7001
* s3 browser (minio) - http://localhost:7004
* postgresql browser - http://localhost:7005

## Scripts

- `bun run dev` – dev server with HMR
- `bun run start` – production server
- `bun run env:up` – start DB (Docker)
- `bun run env:down` – stop Docker
- `bun run env:cleanup` – stop Docker and remove volumes
- `bun run auth:generate` – generate Better Auth schema into `src/db/auth.schema.ts`
- `bun run db:generate` – generate Drizzle migration SQL
- `bun run db:migrate` – run migrations
- `bun run db:studio` – open Drizzle Studio
