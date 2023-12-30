Serverless LLM Playground with Modal (Heavily Inspired by Vercel AI Playground and Nat.dev) [WIP]

https://github.com/mharrvic/serverless-llm-playground/assets/15852818/dbbc9381-45e0-4f27-b422-5a5a1c5eb612

## 1. Getting Started

Requirements:

1. Install packages via pnpm https://pnpm.io/installation and then `pnpm install`
2. Setup your environment variables from `.env.example` and rename it to `.env` then provide the values

Modal setup

1. Save the Modal LLM models to `llm/modal` directory and deploy. Here are some instructions to follow:

   - https://modal.com/docs/guide/ex/openllama
   - https://modal.com/docs/guide/ex/falcon_bitsandbytes#serve-the-model
   - https://modal.com/docs/guide/ex/falcon_gptq
     Make sure to add secrets on `llm-playground-secrets` collection with `AUTH_TOKEN` value for `web_endpoint` authentication layer.

2. Copy the Modal URL and add it to the model config under `src/model-config.ts`

## 2. Vercel Postgres with Drizzle ORM

Setup your pg database https://vercel.com/storage/postgres

Update your schema under `src/lib/db/schema.ts`

To generate migrations

```bash
npm run migrations:generate
```

To push the migrations to the database

```bash
npm run migrations:push
```

To seed

```bash
npm run seed
```

To delete the migrations from the database (if needed, use with caution, don't use in initial setup)

```bash
npm run migrations:drop
```

## 3. Setup your Authentication Provider with Clerk

1. Follow instructions here https://clerk.com/docs/nextjs/get-started-with-nextjs
2. Then setup the webhook from the `api/auth-webhook` for Syncing Clerk data to the database. Read more here https://clerk.com/docs/users/sync-data-to-your-backend

## 4. Run the app

```bash
npm run dev
```

TODO:

- [ ] Proxy Modal endpoint via Next API (for additional protection with Modal auth endpoint)
- [ ] Dynamic model selection
- [ ] Update LLM settings via UI
- [ ] Add settings page
- [ ] Add token count usage
- [ ] Add support for other models from HuggingFace, OpenAI, Anthropic, Cohere, and Replicate

FAQ: <br>
q: Why not use Next.js API routes instead for additional protection with Clerk and Modal endpoint?
a: Because llm generation with modal might take a while like 20-30 seconds and it will timeout the request (also this https://vercel.com/docs/concepts/limits/overview#general-limits)
