# Besos & Caricias Pendientes

Angular web app to keep the count of pending kisses between two authorized users.

## What the app does

- Shows the title `Besos & Caricias Pendientes`
- Prompts for a username before allowing access
- Validates that the username is authorized
- Resolves the active shared session for that user
- Stores each kiss action as an event
- Calculates the pending total for the active session
- Resets the pending kisses for the active session
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
