# 🎛️ Admin Panel Guide

## Overview

Your application now has a **comprehensive admin panel** for managing users, monitoring system health, and controlling the platform.

## 🔗 Access

**URL**: `http://localhost:9002/admin` (or your-domain.com/admin in production)

**Requirements**:
- Must be logged in
- Must have admin access (email in `config/admins`)

## 📊 Features

### 1. Dashboard Overview

**Quick Stats** (Top of page):
- **Total Surveys**: Number of active surveys
- **Total Submissions**: All-time submission count  
- **Today's Submissions**: Last 24 hours
- **Average Rating**: Overall feedback rating

### 2. User Management Tab

**Features**:
- ✅ View all admin users
- ✅ Add new admin access
- ✅ Remove admin access
- ✅ Search admins
- ✅ Instructions for creating user accounts

**How to Add Admin**:
1. Click "Add Admin" button
2. Enter email address
3. Click "Add Admin Access"
4. User must already exist in Firebase Auth

**How to Create User Account**:
1. Go to Firebase Console
2. Authentication → Users
3. Click "Add user"
4. Enter email and password
5. Then add to admin list if needed

**How to Remove Admin**:
1. Find user in list
2. Click trash icon
3. Confirm removal
4. Cannot remove last admin

### 3. System Health Tab

**Features**:
- ✅ Real-time system status
- ✅ Database connectivity check
- ✅ Environment variable verification
- ✅ Memory usage monitoring
- ✅ Latency metrics

**Status Indicators**:
- 🟢 **Healthy**: All systems operational
- 🟡 **Degraded**: System running but slow
- 🔴 **Unhealthy**: System issues detected

**What's Monitored**:
- Database connection and latency
- Environment variables presence
- Memory usage percentage
- API response times

### 4. Data Management Tab

**Features**:
- ✅ Create Firestore backups
- ✅ Export data to JSON
- ✅ Download backups locally
- ✅ Backup best practices

**Backup Options**:

**Option A: Firestore Backup**
- Stores backup in `backups` collection
- Quick and easy
- Stays in Firebase

**Option B: JSON Export**
- Downloads JSON file to computer
- For external storage
- Can be imported elsewhere

**Best Practices**:
- Backup daily or before major updates
- Store exports in secure location
- Test restore procedures quarterly
- Keep backups for at least 30 days

### 5. Security Settings Tab

**Features**:
- ✅ Security status overview
- ✅ Configuration checklist
- ✅ Best practices guide
- ✅ Sign-up status

**Security Checks**:
- Firestore Security Rules
- Admin-Only Access
- Public Sign-ups (Disabled)
- Password Protection
- Rate Limiting
- Input Validation

**Sign-up Configuration**:
- ❌ Public sign-ups disabled
- ✅ Admin-created accounts only
- ✅ Users cannot self-register
- ✅ Full control over user creation

### 6. Activity Log Tab

**Features**:
- ✅ Recent submissions
- ✅ User actions
- ✅ Timestamps
- ✅ User identification

**What's Logged**:
- Feedback submissions
- Survey completions
- User information
- Timestamps

### 7. Settings Tab

**Coming Soon**:
- Environment variable management
- Feature flags
- Email templates
- Notification settings

## 🎯 Common Tasks

### Task 1: Add a New Admin User

1. **Create Account in Firebase Console**
   ```
   Firebase Console → Authentication → Users → Add user
   Email: newadmin@example.com
   Password: [secure password]
   ```

2. **Grant Admin Access**
   ```
   Admin Panel → User Management → Add Admin
   Enter: newadmin@example.com
   Click: Add Admin Access
   ```

3. **Done!** User can now login and access admin panel

### Task 2: Create Backup

1. **Go to Data Management Tab**
2. **Choose Backup Type**:
   - Firestore Backup: Stays in Firebase
   - JSON Export: Downloads to computer
3. **Click** "Create Backup" or "Export Data"
4. **Wait** for completion
5. **Done!** Backup created

### Task 3: Monitor System Health

1. **Go to System Health Tab**
2. **Review Status**:
   - Overall status should be "Healthy"
   - Database should be "up"
   - Environment variables should be "up"
3. **Check Latency**: Should be < 200ms
4. **Refresh** if needed
5. **Done!** System is healthy

### Task 4: Remove Admin Access

1. **Go to User Management Tab**
2. **Find User** in list
3. **Click** trash icon
4. **Confirm** removal
5. **Done!** User no longer has admin access

## 🚨 Troubleshooting

### Cannot Access Admin Panel

**Problem**: Redirected to /unauthorized

**Solutions**:
1. Check you're logged in
2. Verify your email is in admin list:
   ```
   Firestore → config/admins → emails array
   ```
3. Make sure Firestore rules are published
4. Clear browser cache and re-login

### "Admin" Button Shows No Users

**Problem**: Empty admin list

**Solutions**:
1. Check Firestore `config/admins` document exists
2. Verify `emails` field is an array type
3. Add your email to the array
4. Refresh the page

### Health Check Shows "Unhealthy"

**Problem**: System health failing

**Solutions**:
1. Check database connection
2. Verify environment variables in `.env.local`
3. Check Firebase Console for service issues
4. Review browser console for errors

### Cannot Create Backup

**Problem**: Backup fails

**Solutions**:
1. Check Firebase quotas
2. Verify Firestore permissions
3. Check browser console for errors
4. Try JSON export instead

## 🎨 UI Features

### Responsive Design
- ✅ Works on desktop, tablet, mobile
- ✅ Adaptive layout
- ✅ Touch-friendly buttons

### Dark Mode Support
- ✅ Automatically follows system preference
- ✅ All components support dark mode

### Real-time Updates
- ✅ Stats update automatically
- ✅ Live health monitoring
- ✅ Instant user list updates

## 🔐 Security Notes

### Who Can Access
- ✅ Only logged-in admin users
- ✅ Email must be in `config/admins`
- ✅ Enforced by Firestore rules

### What's Protected
- ✅ User management
- ✅ Data backups
- ✅ System settings
- ✅ Activity logs

### What's Public
- ✅ Survey forms (intended)
- ✅ Feedback submission (intended)
- ✅ Login page

## 📈 Best Practices

### Daily
- ✅ Check system health
- ✅ Review activity log
- ✅ Monitor submission count

### Weekly
- ✅ Create backup
- ✅ Review admin users
- ✅ Check for errors

### Monthly
- ✅ Export data to external storage
- ✅ Review security settings
- ✅ Update passwords
- ✅ Test restore procedures

## 🎊 Next Steps

1. **Access the Admin Panel**
   ```
   http://localhost:9002/admin
   ```

2. **Add Yourself as Admin**
   ```
   Firestore → config/admins → emails → Add your email
   ```

3. **Explore Features**
   - Try each tab
   - Create a test backup
   - Check system health
   - Review activity log

4. **Configure Regular Backups**
   - Set up daily backup schedule
   - Store exports in secure location

5. **Train Other Admins**
   - Show them how to access panel
   - Explain each feature
   - Share this guide

---

**Admin Panel URL**: `/admin`  
**Access Required**: Admin authentication  
**Features**: 6 comprehensive tabs  
**Status**: ✅ Fully functional

