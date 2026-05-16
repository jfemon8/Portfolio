# 05 · Deploy to Vercel (Backend + Frontend as 2 projects)

Architecture: **one GitHub repo**, **two Vercel projects** pointing at
different sub-folders.

```
GitHub repo  ──┬──►  Vercel project "portfolio-api"   (Root Directory: server)
               └──►  Vercel project "portfolio-web"   (Root Directory: client)
```

Deploy the **backend first** so you know its URL, then point the frontend at
it.

---

## Step 0 — Push the code to GitHub

```bash
cd d:\Projects\Portfolio
git init
git add .
git commit -m "Initial portfolio (MERN)"
git branch -M main
git remote add origin https://github.com/<you>/portfolio.git
git push -u origin main
```

> `.env` files are git-ignored, so your secrets are **not** pushed. ✅
> Verify with `git status` — you should not see any `.env` listed.

---

## Part A — Deploy the BACKEND (`server/`)

1. Go to **https://vercel.com** → sign in with GitHub.
2. **Add New… → Project** → **Import** your `portfolio` repo.
3. Configure:
   - **Project Name:** `portfolio-api`
   - **Root Directory:** click **Edit** → select **`server`** → **Continue**.
   - **Framework Preset:** `Other`.
   - Build/Output/Install settings: leave defaults (the included
     `server/vercel.json` tells Vercel how to build the serverless function).
4. Expand **Environment Variables** and add (copy values from your local
   `server/.env`):

   | Key | Value |
   |---|---|
   | `MONGODB_URI` | your Atlas string (doc 01) |
   | `JWT_SECRET` | your 64-byte hex secret |
   | `JWT_EXPIRES_IN` | `7d` |
   | `ADMIN_NAME` | `Md Jannatul Ferdhous Emon` |
   | `ADMIN_EMAIL` | `jfemon8@gmail.com` |
   | `ADMIN_PASSWORD` | a strong password |
   | `CLIENT_URL` | `https://portfolio-web.vercel.app` *(set after Part B; can be edited later)* |
   | `CLOUDINARY_CLOUD_NAME` / `_API_KEY` / `_API_SECRET` | doc 02 (optional) |
   | `SMTP_HOST` `SMTP_PORT` `SMTP_SECURE` `SMTP_USER` `SMTP_PASS` `CONTACT_RECEIVER_EMAIL` | doc 03 (optional) |
   | `NODE_ENV` | `production` |

5. Click **Deploy**. Wait ~1 minute.
6. Visit `https://portfolio-api.vercel.app/api/health` →
   `{"success":true,...}`. Note this URL.

### Seed the production database (one time)

Your **local** machine can seed the **cloud** DB (same `MONGODB_URI`):

```bash
cd server
npm run seed        # uses server/.env → which points at Atlas
```

(Atlas is one database; whether you seed from your laptop or anywhere, the
deployed API reads the same data.)

---

## Part B — Deploy the FRONTEND (`client/`)

1. Vercel → **Add New… → Project** → **Import the same repo again**.
2. Configure:
   - **Project Name:** `portfolio-web`
   - **Root Directory:** **Edit** → select **`client`** → **Continue**.
   - **Framework Preset:** Vercel auto-detects **Vite** ✓.
3. Environment Variables:

   | Key | Value |
   |---|---|
   | `VITE_API_URL` | `https://portfolio-api.vercel.app/api` |
   | `VITE_SITE_URL` | `https://portfolio-web.vercel.app` |

4. **Deploy**. Open the site URL — your portfolio is live. 🎉

---

## Part C — Connect the two (CORS)

1. Copy your real frontend URL (e.g. `https://portfolio-web.vercel.app`, or
   your custom domain).
2. Go to the **portfolio-api** project → **Settings → Environment Variables** →
   edit **`CLIENT_URL`** to that exact URL (no trailing slash).
   - Multiple origins? Comma-separate:
     `https://portfolio-web.vercel.app,https://emon.dev`
3. **Redeploy** the API: project → **Deployments → … → Redeploy**.

Without this you'll get `CORS blocked` errors in the browser console.

---

## Custom domain (optional)

`portfolio-web` project → **Settings → Domains** → add `yourname.com`, follow
the DNS records Vercel shows. Then update `CLIENT_URL` (API) and
`VITE_SITE_URL` (web) to the new domain and redeploy both.

## After deployment, update placeholder links

The seeded social links use `your-username` placeholders. Log into
`/admin/login` → **Profile** → fix GitHub/LinkedIn/LeetCode URLs and project
source links. No redeploy needed — it's all dynamic from the database.

➡️ Next (optional automation): [06-GITHUB-CICD.md](06-GITHUB-CICD.md)
