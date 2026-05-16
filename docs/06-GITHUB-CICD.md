# 06 · CI/CD with GitHub Actions

## What's already wired

`.github/workflows/` contains:

| File | Trigger | Does |
|---|---|---|
| `ci.yml` | every push / PR | Strict `tsc` type-check (both) + frontend lint & build (catches breakage early) |
| `deploy-backend.yml` | push to `main` touching `server/**` | Deploys the API to Vercel |
| `deploy-frontend.yml` | push to `main` touching `client/**` | Deploys the site to Vercel |

> **You can skip this entire doc.** When you import the repo in Vercel
> (doc 05), Vercel's own GitHub integration **auto-deploys on every push** with
> zero config. These workflows are an explicit alternative that only deploys
> the project that actually changed (faster, cleaner) and runs CI checks.
>
> If you keep both, disable Vercel's auto-deploy to avoid double deploys:
> each Vercel project → **Settings → Git → Ignored Build Step** →
> `exit 0`, or just don't add these secrets and let Vercel's integration do it.

## If you DO want the Actions-based deploy

### Step 1 — Get a Vercel token

1. https://vercel.com/account/tokens → **Create Token**
2. Name `github-actions`, scope = your account, no expiry (or 1 year).
3. Copy the token (shown once).

### Step 2 — Get the Org & Project IDs

Easiest via the Vercel CLI locally:

```bash
npm i -g vercel
cd server && vercel link     # pick the existing "portfolio-api" project
cd ../client && vercel link  # pick the existing "portfolio-web" project
```

`vercel link` creates `.vercel/project.json` in each folder (git-ignored)
containing:

```json
{ "orgId": "team_xxx", "projectId": "prj_xxx" }
```

- `orgId` is the **same** for both → `VERCEL_ORG_ID`
- `server`'s `projectId` → `VERCEL_BACKEND_PROJECT_ID`
- `client`'s `projectId` → `VERCEL_FRONTEND_PROJECT_ID`

### Step 3 — Add GitHub repository secrets

GitHub repo → **Settings → Secrets and variables → Actions → New repository
secret**. Add:

| Secret | Value |
|---|---|
| `VERCEL_TOKEN` | token from Step 1 |
| `VERCEL_ORG_ID` | `orgId` from Step 2 |
| `VERCEL_BACKEND_PROJECT_ID` | server's `projectId` |
| `VERCEL_FRONTEND_PROJECT_ID` | client's `projectId` |

> Environment variables for the apps themselves (MONGODB_URI, etc.) stay in
> the **Vercel project settings** (doc 05), **not** in GitHub. `vercel pull`
> in the workflow fetches them at build time.

### Step 4 — Push

```bash
git add .
git commit -m "Enable CI/CD"
git push
```

Watch **GitHub repo → Actions** tab. Green check = deployed.
`workflow_dispatch` also lets you trigger a deploy manually from that tab.

### Troubleshooting

| Error | Fix |
|---|---|
| `Error: No existing credentials found` | `VERCEL_TOKEN` missing/typo in secrets. |
| `Project not found` | Wrong `VERCEL_*_PROJECT_ID`, or token lacks access to that project. |
| Two deployments per push | Vercel auto-deploy **and** Actions both run — disable one (see note at top). |
| CI fails on lint | Run `npm run lint` in `client/` locally and fix, or relax rules in `client/.eslintrc.cjs`. |

➡️ Next: [07-ADMIN-AND-SEEDING.md](07-ADMIN-AND-SEEDING.md)
