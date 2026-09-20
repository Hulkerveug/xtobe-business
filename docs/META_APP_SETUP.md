# Meta App + WhatsApp Business Setup Guide
# Complete step-by-step for xtobe-2

## Overview

WhatsApp Cloud API uses **permanent tokens** — no OTP needed. You need:
1. Meta Developer Account
2. Meta App (Business type)
3. WhatsApp Business Account (or use test number)
4. Phone Number ID + Permanent Token
5. Webhook URL (for receiving messages)

---

## Step 1: Create Meta Developer Account

1. Go to https://developers.facebook.com/
2. Log in with your Facebook account
3. Click **Get Started** or **My Apps**
4. Accept the Meta Platform Terms

---

## Step 2: Create a Meta App

1. In Meta for Developers, click **Create App**
2. Select app type: **Business**
3. Enter app name: `XTOBE Business` (or your clinic name)
4. Enter your email
5. Click **Create App**
6. Complete the security check (CAPTCHA)

---

## Step 3: Add WhatsApp to Your App

1. In your app dashboard, find **WhatsApp** in the product list
2. Click **Set Up** or **Add Product**
3. You'll see a **Test Number** provided by Meta (free for testing)
4. This gives you:
   - **Phone Number ID** (a long number like `123456789012345`)
   - **Test Phone Number** (like `+1 555-123-4567`)

---

## Step 4: Get Your Credentials

### 4.1 Get Phone Number ID
1. In WhatsApp → **Configuration** tab
2. Look for **Phone Number ID** — copy this
3. This is your `WHATSAPP_PHONE_ID`

### 4.2 Get Permanent Token
1. In WhatsApp → **Configuration** tab
2. Click **Generate Token** (or use the test token shown)
3. Copy the token — this is your `WHATSAPP_TOKEN`
4. **IMPORTANT:** Save this token somewhere safe. You can only see it once.

### 4.3 Get App Secret
1. Go to **Settings** → **Basic**
2. Find **App Secret** — click **Show**
3. Copy this — this is your `WHATSAPP_APP_SECRET`

### 4.4 Set Verify Token
1. In WhatsApp → **Configuration** → **Webhook**
2. Set a **Verify Token** — this is a custom string you choose
3. Example: `xtobe-verify-2026`
4. This is your `WHATSAPP_VERIFY_TOKEN`

---

## Step 5: Configure Webhook URL

1. In WhatsApp → **Configuration** → **Webhook**
2. Set your **Callback URL**:
   - Local testing: `https://your-tunnel.ngrok.io/api/webhooks/whatsapp`
   - Production: `https://xtobe-business.onrender.com/api/webhooks/whatsapp`
3. Set your **Verify Token** (same as Step 4.4)
4. Click **Verify and Save**
5. Meta will send a GET request to your webhook with a challenge — your server must return the `hub.challenge` value

---

## Step 6: Subscribe to Webhook Events

1. In the Webhook section, click **Manage** or **Edit**
2. Subscribe to these events:
   - `messages` (required — receive WhatsApp messages)
   - `message_statuses` (optional — delivery receipts)
3. Click **Save**

---

## Step 7: Add Your Phone Number (Production)

For production (not testing), you need a real phone number:

1. In WhatsApp → **Configuration** → **Phone Numbers**
2. Click **Add Phone Number**
3. Choose a new number or port an existing one
4. Verify the number via SMS or call
5. Copy the new **Phone Number ID**

---

## Step 8: Set Environment Variables

Add these to your `.env` file:

```bash
# WhatsApp Cloud API
WHATSAPP_TOKEN=your_permanent_token_here
WHATSAPP_PHONE_ID=your_phone_number_id_here
WHATSAPP_VERIFY_TOKEN=xtobe-verify-2026
WHATSAPP_APP_SECRET=your_app_secret_here

# Instagram / Facebook (optional)
INSTAGRAM_TOKEN=
FACEBOOK_PAGE_TOKEN=
```

---

## Step 9: Test the Integration

### 9.1 Send a Test Message
```bash
curl -X POST https://graph.facebook.com/v21.0/YOUR_PHONE_ID/messages \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "messaging_product": "whatsapp",
    "to": "971563136305",
    "type": "text",
    "text": {"body": "Hello from XTOBE! 🎉"}
  }'
```

### 9.2 Test Webhook
Send a message to your WhatsApp test number — it should appear in your xtobe-2 dashboard.

---

## Step 10: Go Live (Production)

1. Submit your app for review in Meta App Dashboard
2. Add your privacy policy URL
3. Add your terms of service URL
4. Complete the app review (usually 1-3 business days)
5. Once approved, your app can send messages to any number

---

## Troubleshooting

| Issue | Solution |
|---|---|
| "Token not found" | Regenerate token in WhatsApp → Configuration |
| "Phone number not found" | Check Phone Number ID matches your account |
| Webhook not receiving | Check callback URL is HTTPS and publicly accessible |
| "App not live" | Submit for review in App Dashboard |
| Messages not sending | Check token hasn't expired (test tokens expire in 24h) |

---

## Security Notes

- **Never commit `.env` to git** — it's already in `.gitignore`
- **Never share your App Secret** — it allows full API access
- **Use HTTPS for webhooks** — Meta requires it
- **Verify webhook signatures** — xtobe-2 already does this with `WHATSAPP_APP_SECRET`

---

## Next Steps

1. Get your Meta App credentials
2. Add them to `.env`
3. Restart xtobe-2 server
4. Test sending/receiving WhatsApp messages
5. Connect to your clinic's WhatsApp Business number

---

**Need help?** Contact your Meta developer support or check the official docs:
https://developers.facebook.com/docs/whatsapp/cloud-api
