# 04 · Run It Locally (step by step)

Prerequisites: **Node.js 18+** (you have v22 ✓) and **npm**. A MongoDB
connection string from [01-MONGODB-ATLAS-SETUP.md](01-MONGODB-ATLAS-SETUP.md).

The repo has two apps:

```
server/   → Express + MongoDB API   (http://localhost:5000)
client/   → React (Vite) front-end  (http://localhost:5173)
```

You run **two terminals** — one for each.

---

## Step 1 — Generate a JWT secret

This signs admin login tokens. Generate a strong random one:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Copy the long hex string it prints.

## Step 2 — Configure the backend

```bash
cd server
copy .env.example .env        # Windows (PowerShell/CMD)
# cp .env.example .env        # macOS/Linux
```

Open `server/.env` and fill in **at minimum**:

```env
MONGODB_URI=...        # from doc 01
JWT_SECRET=...         # the hex string from Step 1
ADMIN_EMAIL=jfemon8@gmail.com
ADMIN_PASSWORD=ChooseAStrongPassword!123
CLIENT_URL=http://localhost:5173
```

Cloudinary (doc 02) and SMTP (doc 03) are optional for first run — leave the
placeholders and add them later.

## Step 3 — Install deps & seed the database

```bash
# still in server/
npm install
npm run seed
```

`npm run seed` connects to MongoDB, **creates your admin account**, and
**populates the portfolio with the data from your CV** (profile, 3 jobs,
4 projects, skills, education, certifications, publication, a sample blog post).

You should see `✅ Admin created` and `🎉 Done!`.

## Step 4 — Start the backend

```bash
npm run dev
```

Leave it running. Test it: open <http://localhost:5000/api/health> →
`{"success":true,"status":"ok",...}`.

## Step 5 — Configure & start the frontend (second terminal)

```bash
cd client
copy .env.example .env        # Windows  (cp on macOS/Linux)
npm install
npm run dev
```

`client/.env` only needs:

```env
VITE_API_URL=http://localhost:5000/api
VITE_SITE_URL=http://localhost:5173
```

Vite opens <http://localhost:5173> automatically.

## Step 6 — Log into the admin dashboard

1. Go to <http://localhost:5173/admin/login>
2. Email = `ADMIN_EMAIL`, Password = `ADMIN_PASSWORD` (from `server/.env`).
3. Edit anything — Profile, Projects, Blog — changes are live on the public
   site immediately.
4. **Go to Settings and change your password.**

---

## Handy commands

| Command | Where | What |
|---|---|---|
| `npm run dev` | server | API with auto-reload (tsx watch) |
| `npm run dev` | client | Vite dev server |
| `npm run typecheck` | server / client / root | Strict `tsc --noEmit` |
| `npm run seed` | server | Seed CV data + ensure admin (safe to re-run) |
| `npm run seed:fresh` | server | **Wipe** content collections then re-seed |
| `npm run create:admin` | server | Only (re)create the admin user |
| `npm run build` | client | Production build into `client/dist` |

## Common issues

| Symptom | Fix |
|---|---|
| Site loads but "Couldn't reach the API" | Backend not running, or `VITE_API_URL` wrong. Restart `client` after editing its `.env`. |
| CORS error in browser console | `CLIENT_URL` in `server/.env` must equal the frontend origin (`http://localhost:5173`). |
| Login fails | Re-run `npm run create:admin`; confirm email/password match `server/.env`. |
| Port 5000 in use | Set `PORT=5001` in `server/.env` and `VITE_API_URL=http://localhost:5001/api`. |

➡️ Next: [05-VERCEL-DEPLOYMENT.md](05-VERCEL-DEPLOYMENT.md)
