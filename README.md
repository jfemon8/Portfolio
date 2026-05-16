# 💻 Md Jannatul Ferdhous Emon — Dynamic Developer Portfolio

A **full-stack, fully-dynamic MERN portfolio** with a "Dark Developer / Neon"
theme — every section is driven by MongoDB and editable from a secure admin
dashboard. Built from the content of the owner's CV.

> Frontend: **Vite + React + TypeScript + Tailwind** &nbsp;·&nbsp; Backend:
> **Node + Express + MongoDB (TypeScript)** &nbsp;·&nbsp; Media: **Cloudinary**
> &nbsp;·&nbsp; Deploy: **Vercel** &nbsp;·&nbsp; CI/CD: **GitHub Actions**

---

## ✨ Features

**Public site**
- Terminal-style animated hero with typewriter roles & live stats
- About, Skills (animated proficiency bars), Experience timeline, Education,
  Credentials (certifications / achievements / publications)
- Projects grid + filters + per-project Markdown **case-study pages**
- **Blog** with Markdown rendering, search, related posts, reading time
- Contact form (stored in DB **and** emailed) with auto-acknowledgement
- Dark-first design with a light-mode toggle, SEO meta tags, code-split routes
- Cookie-less, privacy-friendly visit analytics

**Admin dashboard (`/admin`)**
- JWT login, change password, account settings
- Full CRUD for Profile, Experience, Projects, Skills, Education, Credentials
- Markdown blog editor with live preview, draft/publish, cover images
- Cloudinary image & **resume PDF** uploads
- Messages inbox (read / star / archive / reply)
- Analytics dashboard with charts (views over time, devices, top content)

**Engineering**
- Serverless-ready Express (cached Mongo connection for Vercel)
- Schema-driven admin forms (one component → every resource)
- Helmet, CORS allow-list, rate limiting, centralized error handling
- Validated env config that fails fast on misconfiguration
- Idempotent seed script that loads the CV data + creates the admin

---

## 🗂️ Structure

```
Portfolio/
├── client/                 # React (Vite + TypeScript) front-end → Vercel #1
│   ├── src/
│   │   ├── components/      # layout, ui kit, sections, admin widgets
│   │   ├── pages/           # public pages + pages/admin/* dashboard
│   │   ├── hooks/           # data, theme, typewriter, CRUD
│   │   ├── context/         # AuthContext
│   │   ├── types/           # shared DTOs (mirror the API models)
│   │   └── lib/             # axios client, react-query
│   ├── tsconfig.json
│   └── vercel.json
├── server/                 # Express + MongoDB (TypeScript) → Vercel #2
│   ├── api/index.ts         # Vercel serverless entry
│   ├── src/
│   │   ├── models/  controllers/  routes/  middleware/  config/  utils/
│   │   ├── types/           # shared domain interfaces
│   │   └── app.ts  server.ts
│   ├── scripts/seed.ts      # seeds CV data + admin
│   ├── tsconfig.json
│   └── vercel.json
├── docs/                   # 👉 step-by-step setup guides (read these!)
├── .github/workflows/      # CI + Vercel deploy pipelines
└── .gitignore              # .env and secrets are never committed
```

---

## 🚀 Quick start (local)

```bash
# 1. Backend
cd server
copy .env.example .env          # then fill MONGODB_URI + JWT_SECRET (see docs/01, docs/04)
npm install
npm run seed                    # creates admin + loads CV data
npm run dev                     # → http://localhost:5000

# 2. Frontend (new terminal)
cd client
copy .env.example .env          # VITE_API_URL=http://localhost:5000/api
npm install
npm run dev                     # → http://localhost:5173
```

Admin panel: <http://localhost:5173/admin/login> (credentials = the
`ADMIN_EMAIL` / `ADMIN_PASSWORD` you set in `server/.env`).

---

## 📚 Setup guides — read in order

| # | Guide | What you'll get |
|---|---|---|
| 01 | [MongoDB Atlas Setup](docs/01-MONGODB-ATLAS-SETUP.md) | Free cloud database + connection string (from zero) |
| 02 | [Cloudinary Setup](docs/02-CLOUDINARY-SETUP.md) | Image & resume upload credentials |
| 03 | [Email / SMTP Setup](docs/03-EMAIL-SMTP-SETUP.md) | Contact-form email notifications |
| 04 | [Local Development](docs/04-LOCAL-DEVELOPMENT.md) | Run both apps locally, step by step |
| 05 | [Vercel Deployment](docs/05-VERCEL-DEPLOYMENT.md) | Deploy backend + frontend (2 projects) |
| 06 | [GitHub CI/CD](docs/06-GITHUB-CICD.md) | Automated deploy pipelines |
| 07 | [Admin & Seeding](docs/07-ADMIN-AND-SEEDING.md) | Admin account, seeding, managing content |

> **Brand-new to all this?** Do `01 → 04` to run it on your machine today,
> then `05` to put it online. `02`, `03`, `06` are optional enhancements.

---

## 🔐 Secrets & safety

- All secrets live in `server/.env` / `client/.env`, which are **git-ignored**
  (`.env.example` files document every variable).
- In production, secrets live in **Vercel → Project → Environment Variables**.
- Passwords are bcrypt-hashed; admin routes are JWT-protected; auth & contact
  endpoints are rate-limited.
- After your first deploy, log in and **change the admin password** + replace
  the placeholder social/project URLs (all editable in the dashboard — no code
  changes, no redeploy).

## 🧰 Tech

`TypeScript` (end-to-end, strict) · `React 18` · `Vite` · `Tailwind CSS` ·
`React Router` · `TanStack Query` · `Framer Motion` · `Recharts` ·
`React Hook Form` · `Express` · `Mongoose` · `JWT` · `bcrypt` ·
`Cloudinary` · `Nodemailer` · `Helmet`

> The entire codebase is **TypeScript** (strict) and styled **only with
> Tailwind CSS**. Shared component reuse, consistent patterns and a one-shape
> data model across front-end and back-end are enforced project conventions.

---

Built with the MERN stack. © Md Jannatul Ferdhous Emon.
