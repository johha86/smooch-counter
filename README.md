# Besos & Caricias Pendientes

Angular web app to keep the count of pending kisses between two authorized users.

## What the app does

- Shows the title `Besos & Caricias Pendientes`
- Prompts for a username before allowing access
- Validates that the username is authorized
- Resolves the active shared session for that user
- Persists the authorized username locally to simulate a simple session
- Stores each kiss action as an event
- Calculates the pending total for the active session
- Resets the pending kisses for the active session after user confirmation
- Shows a romantic spinner while loading and saving
- Shows kiss and heart effects when kisses are added

## Tech stack

- Angular 19
- TypeScript
- Supabase JavaScript client
- GitHub Pages deployment with GitHub Actions

## Environment setup

The app expects Supabase client configuration through Angular environment files.

For local development, configure:

- `src/environments/environment.development.ts`

For GitHub Pages deployment, configure repository or environment secrets for:

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`

Do not commit private credentials or internal security configuration to the repository.

## Supabase tables used by the app

The app is wired to these public tables:

### `users`

```sql
create table public.users (
  id bigint generated always as identity not null,
  username character varying not null unique,
  created_at timestamp with time zone not null default now(),
  session_fk bigint,
  constraint users_pkey primary key (id),
  constraint users_session_fk_fkey foreign key (session_fk) references public.sessions(id)
);
```

### `sessions`

```sql
create table public.sessions (
  id bigint generated always as identity not null,
  created_at timestamp with time zone not null default now(),
  username_a bigint not null,
  username_b bigint not null,
  constraint sessions_pkey primary key (id)
);
```

### `pending_kisses_events`

```sql
create table public.pending_kisses_events (
  id bigint generated always as identity not null,
  amount integer not null,
  created_at timestamp with time zone not null default now(),
  username character varying,
  session_fk bigint not null,
  constraint pending_kisses_events_pkey primary key (id),
  constraint pending_kisses_events_session_fk_fkey foreign key (session_fk) references public.sessions(id)
);
```

## How the app uses the tables

- The user enters a value matched against `users.username`
- The app reads `users.session_fk` to determine the active session
- The app reads `sessions.username_a` and `sessions.username_b` to resolve the two names shown in the title line
- Every kiss action creates a row in `pending_kisses_events`
- The counter total is the sum of `pending_kisses_events.amount` for the active `session_fk`
- Reset deletes all `pending_kisses_events` rows for the active `session_fk`

## Local development

### 1. Recommended Node version

Use Node `22`.

The repo includes `.nvmrc` with `22`.

### 2. Install dependencies

```bash
npm install
```

### 3. Start the app

```bash
npm start
```

Angular usually serves it on `http://localhost:4200/`.

## Deployment

### 1. Push to `main`

The workflow deploys on pushes to `main`.

### 2. Enable GitHub Pages

In GitHub repository settings:

- Open `Settings > Pages`
- Set source to `GitHub Actions`

### 3. Add GitHub secrets

Create:

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`

### 4. Build command used by CI

```bash
npm run build -- --configuration github-pages --base-href "/<repo-name>/"
```

## Notes

- Public client configuration should be handled through environment files and GitHub secrets, not documented inline here.
- This README documents the tables used by the app, but intentionally omits internal security and policy details.
