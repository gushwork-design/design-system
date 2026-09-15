# Enabling true one-click email send (EmailJS)

The **Send via email** button works in two modes:

- **Not configured (default):** opens a prefilled email draft in your mail
  app and downloads the PNG + PDF so you can attach them manually.
- **Configured (this guide):** EmailJS sends the email automatically, with
  the front PNG, back PNG, and the PDF delivered as real attachments.

It takes ~10 minutes. No backend or server required.

---

## 1. Create an EmailJS account

1. Sign up at <https://www.emailjs.com/> (free tier is fine to test).
2. **Email Services → Add New Service** → connect the inbox the cards
   should be sent *from* (e.g. a Gmail/Workspace account). Note the
   **Service ID** (looks like `service_xxxxxxx`).
3. **Account → General / API Keys** → copy your **Public Key**.

> **Attachments note:** dynamic attachments are a paid EmailJS feature on
> some plans. If your plan doesn't include attachments, the email will
> still send (subject + body) but without the files — in that case keep
> the draft-and-download fallback instead.

---

## 2. Create the email template

**Email Templates → Create New Template.** Configure it like this:

| Field | Value |
|-------|-------|
| **To Email** | `{{to_email}}` |
| **Cc** | `{{cc_email}}` (optional — leave blank-safe; empty when no CC entered) |
| **From Name** | `Gushwork ID Card Creator` (static, or `{{to_name}}`) |
| **Subject** | `{{subject}}` |
| **Content** | `{{message}}` (plain text is fine; the app sends a ready-written body) |

Then add **three dynamic attachments** (the "Attachments" section of the
template editor → **Add Attachment → Variable Attachment** for each):

| # | Content (Parameter) | Filename | Content-Type |
|---|---------------------|----------|--------------|
| 1 | `{{front_b64}}` | `{{front_name}}` | `image/png` |
| 2 | `{{back_b64}}`  | `{{back_name}}`  | `image/png` |
| 3 | `{{pdf_b64}}`   | `{{pdf_name}}`   | `application/pdf` |

> The content values are base64 strings the app sends automatically.
> If a side is excluded at send time its variable is empty — you can
> leave all three attachments in place; empty ones are skipped.

Save the template and note its **Template ID** (`template_xxxxxxx`).

---

## 3. Paste your keys into the app

Open **`app.jsx`**, find `EMAILJS_CONFIG` near the top, and replace the
placeholders:

```js
const EMAILJS_CONFIG = {
  publicKey: 'xxxxxxxxxxxxxxxx',   // Account → API Keys → Public Key
  serviceId: 'service_xxxxxxx',    // Email Services → your service
  templateId: 'template_xxxxxxx',  // Email Templates → your template
};
```

Save. That's it — the button now reads **"Email sent"** on success and
delivers the attachments automatically. Until all three are filled in, it
stays in the draft-and-download fallback mode.

---

## Template parameters the app sends

| Param | Meaning |
|-------|---------|
| `to_email` | Recipient — the email entered in the editor panel |
| `cc_email` | Optional CC address(es) from the Send popover (comma-separated; empty if none) |
| `to_name` | Cardholder name |
| `title` | Job title |
| `id_code` | Employee ID code |
| `subject` | Prewritten subject line |
| `message` | Prewritten email body |
| `front_b64` / `front_name` | Front PNG (base64) + filename |
| `back_b64` / `back_name` | Back PNG (base64) + filename |
| `pdf_b64` / `pdf_name` | Combined PDF (base64) + filename |

## Notes & limits

- Attachments are captured at 3× (smaller than the 4× print download) to
  stay within EmailJS's per-email size cap. If you hit a size error,
  lower the ratio in `captureCardPng(... , 3)` calls inside `doSendEmail`.
- The free EmailJS tier has a monthly send quota and may add a small
  "Sent via EmailJS" footer; paid tiers remove both.
- Your public key is, by design, safe to ship in client code. Lock down
  abuse via EmailJS's **allowed origins** and quota settings.
