# Email Credentials Setup

## Add these to your `.env.local` file:

```bash
# Gmail SMTP for sending YEP invite emails
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-app-password-here
```

## How to Get Gmail App Password:

1. Go to your Google Account: https://myaccount.google.com/
2. Click "Security" in the left sidebar
3. Enable "2-Step Verification" if not already enabled
4. After 2FA is enabled, go back to Security
5. Scroll down to "2-Step Verification" section
6. Click "App passwords" at the bottom
7. Select "Mail" and "Other (Custom name)"
8. Name it "SCAGO YEP Invites"
9. Click "Generate"
10. Copy the 16-character password (no spaces)
11. Add it to `.env.local` as GMAIL_APP_PASSWORD

## Alternative: Use a different SMTP service

If you prefer not to use Gmail, you can use any SMTP service. Update the nodemailer config in `src/app/youth-empowerment/invite-actions.ts`:

```typescript
const transporter = nodemailer.createTransport({
  host: 'smtp.yourprovider.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});
```

## After adding credentials:

1. Restart your dev server
2. Send a test invite from the admin panel
3. Email should arrive within seconds










