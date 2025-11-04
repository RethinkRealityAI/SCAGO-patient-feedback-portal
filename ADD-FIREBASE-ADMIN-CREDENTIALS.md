# Add Firebase Admin SDK Credentials

## Quick Steps to Get Service Account Credentials

### Method 1: Firebase Console (Recommended - 2 minutes)

1. **Open this URL in your browser:**
   ```
   https://console.firebase.google.com/project/scago-feedback/settings/serviceaccounts/adminsdk
   ```

2. **Click "Generate new private key"**
   - A button near the bottom of the page
   - Confirm the action in the popup

3. **Download the JSON file**
   - File will be named something like: `scago-feedback-firebase-adminsdk-xxxxx.json`
   - **IMPORTANT**: Keep this file secure and never commit it to git!

4. **Open the downloaded JSON file**
   - You'll see something like this:
   ```json
   {
     "type": "service_account",
     "project_id": "scago-feedback",
     "private_key_id": "...",
     "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
     "client_email": "firebase-adminsdk-xxxxx@scago-feedback.iam.gserviceaccount.com",
     "client_id": "...",
     "auth_uri": "https://accounts.google.com/o/oauth2/auth",
     "token_uri": "https://oauth2.googleapis.com/token",
     "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
     "client_x509_cert_url": "..."
   }
   ```

5. **Copy these three values from the JSON:**
   - `project_id` (should be "scago-feedback")
   - `private_key` (starts with "-----BEGIN PRIVATE KEY-----")
   - `client_email` (ends with @scago-feedback.iam.gserviceaccount.com)

6. **Add to your `.env.local` file:**
   
   Open `.env.local` and add these lines at the end:
   ```bash
   # Firebase Admin SDK (Server-side only)
   FIREBASE_PROJECT_ID="scago-feedback"
   FIREBASE_CLIENT_EMAIL="YOUR-CLIENT-EMAIL-HERE@scago-feedback.iam.gserviceaccount.com"
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR-KEY-HERE\n-----END PRIVATE KEY-----\n"
   ```

   **IMPORTANT**: Keep the `\n` characters in the FIREBASE_PRIVATE_KEY - they are required!

7. **Restart your development server:**
   ```bash
   # Stop the current server (Ctrl+C)
   # Then restart:
   npm run dev
   ```

### Method 2: Using gcloud CLI (Advanced)

If you have gcloud CLI installed:

```bash
gcloud iam service-accounts keys create service-account.json \
  --iam-account firebase-adminsdk@scago-feedback.iam.gserviceaccount.com \
  --project scago-feedback
```

Then follow steps 4-7 above.

---

## Testing After Adding Credentials

Once you've added the credentials and restarted the server:

1. **Navigate to the admin panel:**
   ```
   http://localhost:9002/admin
   ```

2. **Go to the "YEP Invites" tab**

3. **Fill in the test invite:**
   - **Role**: Participant
   - **Full Name**: Dapo Ajisafe
   - **Email**: dapo.ajisafe@gmail.com

4. **Click "Send Invite"**

5. **Check the email** (dapo.ajisafe@gmail.com) for the password reset link (acts as magic link)

6. **Click the link** and set a password

7. **Verify the user can:**
   - Log in successfully
   - Access their profile at `/profile`
   - Upload documents
   - Update their information

---

## Security Reminders

- ✅ The service account JSON file is in `.gitignore` (check: `*-firebase-adminsdk-*.json`)
- ⚠️ **NEVER** commit the service account file to git
- ⚠️ **NEVER** share the private key publicly
- ✅ Store the JSON file securely (password manager, secure vault)
- ✅ If compromised, generate a new key immediately and delete the old one

---

## Troubleshooting

### "Missing Firebase Admin credentials" error
- Make sure you added all three environment variables
- Check that there are no extra quotes or spaces
- Verify the `\n` characters are preserved in FIREBASE_PRIVATE_KEY
- Restart the development server

### "Permission denied" error
- The service account needs the "Firebase Admin SDK Administrator" role
- This is automatically granted when you generate the key from Firebase Console

### "Invalid format" error
- Make sure the private key includes the full content:
  ```
  -----BEGIN PRIVATE KEY-----
  (key content)
  -----END PRIVATE KEY-----
  ```
- Keep the `\n` characters - they represent line breaks

---

## Next Steps After Setup

Once credentials are working:
1. ✅ Test sending invite to dapo.ajisafe@gmail.com
2. ✅ Verify email delivery
3. ✅ Test magic link sign-in flow
4. ✅ Test profile access and document upload
5. ✅ Test bulk invite functionality
6. ✅ Document the process for production deployment


















