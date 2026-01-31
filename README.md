# bun-react-tailwind-shadcn-template

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

## Run order (first time / after clone)

1. Start DB: `bun run env:up`
4. Apply migrations: `bun run db:migrate`
5. Start dev server: `bun run dev`

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

This project was created using `bun init` in bun v1.3.8. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
