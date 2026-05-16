# 03 · Email (Gmail SMTP) — Contact-Form Notifications

When someone submits the **Contact** form:

1. The message is **saved to MongoDB** (always — visible in admin → Messages).
2. You get an **email notification**, and the sender gets an **auto-reply**.

Step 2 needs SMTP credentials. The easiest is a **Gmail App Password**.

> ✅ Email is **optional**. Without it the contact form still works and stores
> messages in the database — you just won't get the email notification.

---

## Step 1 — Enable 2-Step Verification on your Google account

App Passwords require it.

1. Go to **https://myaccount.google.com/security**
2. Under **"How you sign in to Google"** → **2-Step Verification** → turn it
   **On** (follow the phone prompts).

## Step 2 — Create an App Password

1. Go to **https://myaccount.google.com/apppasswords**
   (or Security → 2-Step Verification → scroll to **App passwords**).
2. App name: type `Portfolio` → **Create**.
3. Google shows a **16-character password** like `abcd efgh ijkl mnop`.
4. **Copy it and remove the spaces** → `abcdefghijklmnop`.
   (You won't be able to see it again — generate a new one if lost.)

## Step 3 — Put it in your environment file

In `server/.env`:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=jfemon8@gmail.com
SMTP_PASS=abcdefghijklmnop
CONTACT_RECEIVER_EMAIL=jfemon8@gmail.com
```

- `SMTP_USER` = the Gmail address that **sends** the mail.
- `CONTACT_RECEIVER_EMAIL` = where contact messages are **delivered** (can be
  the same address or a different one).

## Step 4 — Verify

1. Restart the backend.
2. Open the public site → **Contact** section → send yourself a test message.
3. You should receive the notification email within a few seconds, and the
   message should appear in **admin → Messages**.

---

### Using a different provider (Outlook, custom domain, SendGrid…)

Just change the SMTP values. Examples:

| Provider | HOST | PORT | SECURE |
|---|---|---|---|
| Gmail | `smtp.gmail.com` | `465` | `true` |
| Outlook/Hotmail | `smtp-mail.outlook.com` | `587` | `false` |
| SendGrid | `smtp.sendgrid.net` | `587` | `false` (USER = `apikey`) |
| Zoho | `smtp.zoho.com` | `465` | `true` |

### Troubleshooting

| Symptom | Fix |
|---|---|
| `Invalid login: 535-5.7.8` | You used your normal Gmail password — must be an **App Password**. |
| `Missing credentials for "PLAIN"` | `SMTP_USER` / `SMTP_PASS` empty. |
| Mail in spam | Normal for a brand-new sender; mark "not spam" once. |
| Works locally, not on Vercel | Add the SMTP_* vars to the backend Vercel project env. See [05](05-VERCEL-DEPLOYMENT.md). |

➡️ Next: [04-LOCAL-DEVELOPMENT.md](04-LOCAL-DEVELOPMENT.md)
