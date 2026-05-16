# 02 · Cloudinary — Image & Resume Uploads (from scratch)

Cloudinary stores and serves the images you upload from the **admin
dashboard** (project covers, blog covers, avatar) and your **resume PDF**.
It has a generous free tier (25 GB storage / 25 GB bandwidth per month).

You will end with **3 values**: `CLOUDINARY_CLOUD_NAME`,
`CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.

---

## Step 1 — Create a Cloudinary account

1. Go to **https://cloudinary.com/users/register_free**
2. Sign up (Google works) and verify your email.
3. When asked "what describes you best" pick anything (e.g. *Developer*) —
   skip optional steps.

## Step 2 — Find your credentials

1. After login you land on the **Dashboard** (also reachable via the
   **Programmable Media → Dashboard** menu, or the home icon).
2. You'll see a **Product Environment Credentials** card showing:

   ```
   Cloud name:  dxxxxxx
   API Key:     123456789012345
   API Secret:  ****************   (click the eye / "Reveal" to see it)
   ```

3. Click **Copy** next to each one.

> The whole "API environment variable" string looks like
> `cloudinary://API_KEY:API_SECRET@CLOUD_NAME` — you only need the three
> individual parts, not the whole URL.

## Step 3 — Put them in your environment file

In `server/.env`:

```env
CLOUDINARY_CLOUD_NAME=dxxxxxx
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=your-revealed-secret
CLOUDINARY_FOLDER=portfolio
```

`CLOUDINARY_FOLDER` is just the folder name uploads are organised under in
your Cloudinary Media Library — leave it as `portfolio`.

## Step 4 — Verify

1. Start the backend (`npm run dev` in `server/`) and the frontend
   (`npm run dev` in `client/`).
2. Log into the admin panel → **Projects** → **Add new** → upload a cover
   image. If it appears, Cloudinary is working. ✅
3. You can also see the file appear under **Media Library → portfolio** in the
   Cloudinary console.

---

### Notes & troubleshooting

- **It is safe to skip Cloudinary at first.** If these vars are empty the app
  still runs — only image uploading is disabled (the server logs a warning).
  You can paste external image URLs manually until you set it up.
- `Upload failed (is Cloudinary configured?)` in the dashboard → the three
  vars are missing/typo'd in `server/.env`, **or** (in production) not added to
  the backend's Vercel Environment Variables. See
  [05-VERCEL-DEPLOYMENT.md](05-VERCEL-DEPLOYMENT.md).
- The **API Secret is sensitive** — it lives only in `server/.env` (git-ignored)
  and in Vercel's encrypted env vars. Never put it in the frontend.

➡️ Next: [03-EMAIL-SMTP-SETUP.md](03-EMAIL-SMTP-SETUP.md)
