# 07 · Admin Account, Seeding & Managing Content

## The admin account

There is **no public sign-up** (this is a personal portfolio). The single
admin user is created by the **seed script** from these `server/.env` vars:

```env
ADMIN_NAME=Md Jannatul Ferdhous Emon
ADMIN_EMAIL=jfemon8@gmail.com
ADMIN_PASSWORD=ChooseAStrongPassword!123
```

Create / ensure it:

```bash
cd server
npm run create:admin      # creates admin only (skips content)
# or
npm run seed              # creates admin + seeds all CV content
```

Then log in at **`/admin/login`** and immediately go to
**Settings → Change password**.

> Changing `ADMIN_PASSWORD` in `.env` later does **not** change an
> already-created account (the script skips existing users). To reset:
> change the password from the dashboard, or delete the user document in
> Atlas and re-run `npm run create:admin`.

## The seed script

`server/scripts/seed.ts` populates the database with everything parsed from
your CV:

- **Profile** — name, title, summary, roles, contact, socials, stats,
  languages
- **Experience** — OnnoRokom Projukti, SM Technology, University of Barishal
- **Projects** — RDSWA, Bangaliyana, QuickQuiz, AgriBlog
- **Skills** — languages, frameworks, databases, tools, concepts (with levels)
- **Education** — University of Barishal, Collectorate College, Sundarganj HS
- **Certifications & achievements** — Phitron, HackerRank, ICT Division,
  Codeforces Pupil, CodeChef 3★, 1000+ problems, 100+ contests
- **Publication** — the Python code-smell detection paper
- **A sample blog post**

| Command | Behaviour |
|---|---|
| `npm run seed` | **Upsert** — adds missing items, keeps your edits. Safe to re-run. |
| `npm run seed:fresh` | **Wipes** content collections first, then re-seeds the CV defaults. Messages & analytics are never touched. |
| `npm run create:admin` | Admin user only. |

## Managing content (no code needed)

Everything is editable from the dashboard at `/admin`:

| Section | What you manage |
|---|---|
| **Profile** | Hero text, summary, avatar, **resume PDF**, socials, stats, languages |
| **Experience** | Jobs (timeline) |
| **Projects** | Cards + Markdown case studies, cover images, featured flag |
| **Skills** | Skills + proficiency %, grouped by category |
| **Education** | Degrees |
| **Credentials** | Certifications, achievements, publications (tabbed) |
| **Blog** | Write Markdown posts, draft/publish, cover image |
| **Messages** | Contact-form inbox (read/star/archive/reply) |
| **Analytics** | Cookie-less views, devices, top content |
| **Settings** | Your name + password |

### First things to update after deploy

The seed uses placeholder URLs. Log in and fix:

1. **Profile → Social links** — real GitHub / LinkedIn / LeetCode URLs.
2. **Projects** — real **Source code** / **Live** URLs, add cover images.
3. **Profile → Resume** — upload your real CV PDF (needs Cloudinary, doc 02);
   the **Resume** button then appears in the hero.
4. **Settings** — change the password.

## Security notes

- Passwords are hashed with **bcrypt** (cost 12) — never stored in plain text.
- Admin APIs require a **JWT** (`Authorization: Bearer …`), 7-day expiry.
- Auth and contact endpoints are **rate-limited** (10 req / 15 min) to deter
  brute force & spam.
- Keep `JWT_SECRET` long & secret. Rotating it logs everyone out (fine for a
  single admin).

⬅️ Back to the [main README](../README.md)
