# 01 · MongoDB Atlas — Create a Free Database (from scratch)

This is the database that stores **everything** dynamic in your portfolio
(profile, projects, blog, messages, analytics, admin user).

You will end with a **connection string** that looks like:

```
mongodb+srv://portfolioUser:S0meStrongPass@cluster0.ab12c.mongodb.net/portfolio?retryWrites=true&w=majority
```

---

## Step 1 — Create a MongoDB Atlas account

1. Go to **https://www.mongodb.com/cloud/atlas/register**
2. Sign up (Google sign-in is fastest) and verify your email.
3. On the welcome questionnaire pick anything (e.g. "Learn MongoDB") — it does
   not affect anything. Click **Finish**.

## Step 2 — Create a free cluster

1. Click **Build a Database** (or **+ Create**).
2. Choose the **M0 FREE** tier (it says **$0/month forever**).
3. **Provider:** AWS. **Region:** pick the one closest to you (for Bangladesh,
   `Mumbai (ap-south-1)` is a good low-latency choice).
4. **Cluster name:** leave as `Cluster0`.
5. Click **Create Deployment**. Provisioning takes ~1–3 minutes.

## Step 3 — Create a database user

A dialog titled **"Connect to Cluster0"** usually appears automatically. If
not: left sidebar → **Database Access** → **Add New Database User**.

1. **Authentication Method:** Password.
2. **Username:** `portfolioUser`
3. **Password:** click **Autogenerate Secure Password** → **Copy** it and
   paste it somewhere safe for a minute. (Avoid the characters `@ : / ?` in a
   custom password — they break connection strings. If you must use them, see
   "URL-encoding" at the bottom.)
4. **Database User Privileges:** `Read and write to any database`.
5. Click **Add User**.

## Step 4 — Allow network access

Left sidebar → **Network Access** → **Add IP Address**.

- For development + Vercel (Vercel uses dynamic IPs), click
  **ALLOW ACCESS FROM ANYWHERE** → it fills in `0.0.0.0/0` → **Confirm**.
- (More secure later: restrict to your IP for local work, but `0.0.0.0/0` is
  required for Vercel serverless functions to connect.)

## Step 5 — Get the connection string

1. Left sidebar → **Database** → on `Cluster0` click **Connect**.
2. Choose **Drivers**.
3. Driver: **Node.js**, Version: the latest.
4. Copy the connection string. It looks like:

   ```
   mongodb+srv://portfolioUser:<password>@cluster0.ab12c.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
   ```

5. **Two edits you must make:**
   - Replace `<password>` with the password you copied in Step 3.
   - Add the database name `portfolio` **right before the `?`**:

   ```
   mongodb+srv://portfolioUser:S0meStrongPass@cluster0.ab12c.mongodb.net/portfolio?retryWrites=true&w=majority&appName=Cluster0
   ```

## Step 6 — Put it in your environment file

Open `server/.env` (copy it from `server/.env.example` if it does not exist)
and set:

```env
MONGODB_URI=mongodb+srv://portfolioUser:S0meStrongPass@cluster0.ab12c.mongodb.net/portfolio?retryWrites=true&w=majority&appName=Cluster0
```

✅ Done. The collections (`profiles`, `projects`, …) are created automatically
the first time the server / seed script runs — you do **not** create tables
manually.

---

### Verify it works

From the `server/` folder:

```bash
npm install
npm run seed      # connects, creates the admin + seeds CV data
```

You should see `✅ MongoDB connected: ...` and `🎉 Done!`.

### Troubleshooting

| Error | Fix |
|---|---|
| `bad auth : authentication failed` | Wrong username/password, or `<password>` placeholder not replaced. |
| `querySrv ETIMEOUT` / `connection timed out` | Network Access not set to `0.0.0.0/0`, or firewall/VPN blocking. |
| Password has `@ # ? / : %` | URL-encode it: `@`→`%40`, `#`→`%23`, `?`→`%3F`, `/`→`%2F`, `:`→`%3A`, `%`→`%25`. Easiest: regenerate a password with only letters & digits. |

➡️ Next: [02-CLOUDINARY-SETUP.md](02-CLOUDINARY-SETUP.md)
