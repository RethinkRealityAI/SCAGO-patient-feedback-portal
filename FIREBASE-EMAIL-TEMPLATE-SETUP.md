# 📧 Firebase Email Template Configuration for YEP Invites

## Issue
YEP invite emails are being "sent" but not received. This is because Firebase email templates need to be customized in the Firebase Console.

## What's Happening
When you send a YEP invite via the admin panel:
1. ✅ Firebase Auth user is created successfully
2. ✅ Firestore record is created/updated successfully  
3. ✅ `generatePasswordResetLink()` is called successfully
4. ❌ **Email is not delivered** because template isn't properly configured

---

## 🔧 Solution: Configure Email Templates in Firebase Console

### Step 1: Access Email Template Settings

**Direct Link**: https://console.firebase.google.com/project/scago-feedback/authentication/emails

**Or navigate manually:**
1. Go to Firebase Console: https://console.firebase.google.com/
2. Select project: **scago-feedback**
3. Left sidebar: **Build** → **Authentication**
4. Click the **Templates** tab at the top

---

### Step 2: Customize Password Reset Email Template

The YEP invite system uses the **Password Reset** email template (since we're using `generatePasswordResetLink()` as a magic link).

#### 2.1: Edit Password Reset Template

1. In the **Templates** tab, find **"Password reset"**
2. Click the **pencil icon** (edit) on the right side

#### 2.2: Configure Sender Information

**Template name**: `Password reset` (leave as is)

**Sender name**: 
```
SCAGO Youth Empowerment Program
```
_Or use:_
```
SCAGO YEP
```

**Sender email**: 
```
noreply@scago-feedback.firebaseapp.com
```
_This is the default Firebase sender. You can customize this later with a custom domain._

**Reply-to email** (optional):
```
support@yourdomain.com
```
_Add your actual support email if you want users to be able to reply._

#### 2.3: Customize Email Subject

**Subject line**:
```
Welcome to SCAGO Youth Empowerment Program - Complete Your Profile
```

_Or shorter:_
```
Complete Your SCAGO YEP Profile
```

#### 2.4: Customize Email Body

Replace the default email body with this custom template:

```html
<p>Hello,</p>

<p>You've been invited to join the <strong>SCAGO Youth Empowerment Program</strong>!</p>

<p>To complete your profile and access your portal, please click the link below to set your password:</p>

<p><a href="%LINK%" style="background-color: #0070f3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Complete Your Profile</a></p>

<p>Or copy and paste this link into your browser:</p>
<p><code>%LINK%</code></p>

<p><strong>This link will expire in 1 hour.</strong></p>

<p>If you didn't request this invitation, you can safely ignore this email.</p>

<hr>
<p style="font-size: 12px; color: #666;">
  This email was sent by SCAGO Youth Empowerment Program<br>
  For support, please contact your program administrator
</p>
```

**Important**: Keep the `%LINK%` placeholder - Firebase will replace this with the actual password reset link.

#### 2.5: Save Template

1. Review all changes
2. Click **"Save"** button (bottom right)
3. Confirm if prompted

---

### Step 3: Test Email Delivery

#### 3.1: Check Email Configuration Status

After saving, check these settings:

**In Firebase Console → Authentication → Templates:**
- [ ] Password reset template shows "Customized" status
- [ ] Sender name is set
- [ ] Subject line is customized

#### 3.2: Test Sending an Invite

1. Go to your app: http://localhost:9002/admin
2. Click **"YEP Invites"** tab
3. Send a test invite to **your own email address**
4. Fill in:
   - **Email**: your-email@example.com
   - **Role**: Participant
   - **Name**: Test User
   - **Send Email**: ✅ checked
5. Click **"Send Invite"**

#### 3.3: Check Your Inbox

**Wait 1-2 minutes** and check:
- [ ] Email received in inbox
- [ ] Subject line is customized
- [ ] Email is from "SCAGO Youth Empowerment Program"
- [ ] Link works when clicked

**If email not received**, check:
- [ ] Spam/Junk folder
- [ ] Promotions tab (Gmail)
- [ ] Email address is correct

---

## 🚨 Common Issues & Solutions

### Issue 1: Email Still Not Received

**Possible causes:**

1. **Email provider blocking Firebase emails**
   - Try a different email provider (Gmail usually works well)
   - Check spam/junk folders
   - Add `noreply@scago-feedback.firebaseapp.com` to contacts

2. **Template not saved properly**
   - Go back to Templates tab
   - Verify changes are showing
   - Try editing and saving again

3. **Firebase project email service not enabled**
   - Should be automatic, but verify in Firebase Console
   - Check project settings for any email-related warnings

### Issue 2: Email Goes to Spam

**Solutions:**
- Add SPF record for Firebase domain (requires custom domain setup)
- Use custom domain with proper email authentication (see below)
- Ask recipients to add sender to contacts/safe senders list

### Issue 3: Generic "noreply" Sender Name

**Solutions:**
- Make sure you clicked "Save" after editing sender name
- Clear browser cache and check again
- It can take a few minutes to propagate

---

## 🎨 Advanced: Custom Email Domain (Optional)

For production use, you may want to send emails from your own domain (e.g., `noreply@yourdomain.com`) instead of `noreply@scago-feedback.firebaseapp.com`.

### Benefits:
- ✅ Professional appearance
- ✅ Better deliverability
- ✅ Reduced spam probability
- ✅ Custom branding

### Requirements:
- Your own domain name
- Access to domain DNS settings
- Firebase Blaze (pay-as-you-go) plan

### Setup Process:

#### Step 1: Upgrade to Firebase Blaze Plan

1. Go to Firebase Console → Settings (gear icon) → Usage and billing
2. Click "Modify plan"
3. Select "Blaze (Pay as you go)"
4. Note: Email sending is still mostly free (generous free tier)

#### Step 2: Set Up Custom Email Domain

Firebase doesn't directly support custom SMTP, but you have two options:

**Option A: Use SendGrid with Firebase Functions** (Recommended)
- Set up SendGrid account (free tier available)
- Configure Firebase function to send emails via SendGrid
- Use custom domain with proper SPF/DKIM records

**Option B: Use Mailgun/Postmark**
- Similar to SendGrid
- Set up service and integrate with Firebase

**Option C: Keep Firebase Default**
- Simplest option
- Works well for most use cases
- Requires good email template to avoid spam

---

## 📋 Quick Checklist

### Before Sending Invites:
- [ ] Password Reset template customized in Firebase Console
- [ ] Sender name set to "SCAGO Youth Empowerment Program"
- [ ] Subject line customized
- [ ] Email body customized with branding
- [ ] Template saved successfully
- [ ] Test email sent to yourself
- [ ] Test email received and link works

### For Production Deployment:
- [ ] Test with multiple email providers (Gmail, Outlook, etc.)
- [ ] Check spam folder for all providers
- [ ] Consider custom domain setup if spam issues persist
- [ ] Add support email in reply-to field
- [ ] Document invite process for admins

---

## 🔍 Debugging Email Issues

### Check Firebase Logs

If emails aren't sending, check Firebase logs for errors:

**In Firebase Console:**
1. Go to **Functions** (if using functions)
2. Check **Logs** tab for errors

**Or check browser console:**
1. Open browser DevTools (F12)
2. Go to **Console** tab
3. Send an invite
4. Look for any error messages

### Verify Email Configuration

Run this diagnostic in your browser console while on the admin page:

```javascript
// Check if environment variables are set
console.log('App URL:', process.env.NEXT_PUBLIC_APP_URL);

// This should show the Firebase config
console.log('Firebase config:', {
  projectId: 'scago-feedback',
  authDomain: 'scago-feedback.firebaseapp.com'
});
```

### Test Email Link Generation

The invite action should return success:

```typescript
const result = await sendYEPInvite({
  email: 'test@example.com',
  role: 'participant',
  name: 'Test User',
  sendEmail: true
});

console.log('Result:', result);
// Should show: { success: true, userId: '...', inviteCode: '...' }
```

---

## 📚 Additional Resources

### Firebase Documentation:
- **Email Templates**: https://firebase.google.com/docs/auth/custom-email-handler
- **Authentication**: https://firebase.google.com/docs/auth
- **Email Sending Best Practices**: https://firebase.google.com/docs/auth/web/email-link-auth

### Email Deliverability:
- **SPF Records**: https://www.cloudflare.com/learning/dns/dns-records/dns-spf-record/
- **DKIM Setup**: https://www.cloudflare.com/learning/dns/dns-records/dns-dkim-record/

---

## ✅ Verification

After completing setup, verify:

### Immediate Test:
1. Send invite to your email
2. Email received within 1-2 minutes
3. Subject line is customized
4. Email content is branded
5. Link redirects to `/profile?welcome=true`
6. User can set password and access profile

### Production Readiness:
1. Test with multiple email providers
2. Test bulk invite feature (send to 3-5 test accounts)
3. Verify all emails received
4. Check spam scores if possible
5. Document process for other admins

---

## 🎯 Summary

**The core issue**: Firebase email templates need to be customized in the Console, even though the code is working correctly.

**The fix**: 
1. Go to Firebase Console → Authentication → Templates
2. Edit "Password reset" template
3. Customize sender name, subject, and body
4. Save changes
5. Test by sending invite to yourself

**Expected result**: Emails should start arriving within 1-2 minutes with custom branding and clear call-to-action.

---

**Need Help?** 
- Check Firebase Console for any warnings in Authentication section
- Review logs in browser console when sending invites
- Verify Firebase Admin SDK credentials in `.env.local`
- Test with different email addresses (Gmail, Outlook, etc.)










