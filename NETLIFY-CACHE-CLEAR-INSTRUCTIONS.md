# 🚨 URGENT: Clear Netlify Cache to Remove Exposed API Keys

## Problem
The Google API key is **cached in Netlify's build cache** from previous builds. Even though we've fixed the code, the old cached webpack bundles still contain the API key pattern "AIza***".

## ✅ Solutions Applied

### 1. **Webpack Configuration** (`next.config.ts`)
Added configuration to **prevent AI modules from being bundled client-side**:
- Externalized `genkit` and `@genkit-ai/googleai` packages
- Set aliases to block client-side imports of AI code
- These packages will only be bundled server-side now

### 2. **Cache Busting** (`netlify.toml`)
Added `NETLIFY_CACHE_ID` to force Netlify to use a fresh cache.

---

## 🔧 Required Actions

### **CRITICAL STEP 1: Clear Netlify Build Cache**

You MUST manually clear the Netlify build cache. Choose one method:

#### **Method A: Via Netlify UI** (Recommended)
1. Go to your Netlify dashboard
2. Navigate to: **Site settings → Build & deploy → Build settings**
3. Scroll down to **"Clear cache and retry deploy"** section
4. Click **"Clear build cache"** button
5. Then click **"Trigger deploy"** → **"Clear cache and deploy site"**

#### **Method B: Via Netlify CLI**
```bash
netlify build --clear-cache
```

#### **Method C: Via API**
```bash
curl -X DELETE "https://api.netlify.com/api/v1/sites/YOUR_SITE_ID/deploys/latest/cache" \
  -H "Authorization: Bearer YOUR_NETLIFY_TOKEN"
```

---

### **STEP 2: Commit and Push Changes**

```bash
git add next.config.ts netlify.toml NETLIFY-CACHE-CLEAR-INSTRUCTIONS.md
git commit -m "fix: prevent AI modules from client bundle + clear cache"
git push
```

---

### **STEP 3: Verify Build**

After clearing cache and deploying:

1. **Check build logs** - Should NOT see "AIza***" in any files
2. **Scan should pass** - Should see: "✓ Scanning complete. 0 instances of secrets"
3. **Build should succeed** - No more secrets scanning errors

---

## 🔍 What Changed

### **Before (BROKEN)**
```javascript
// Webpack was bundling @genkit-ai/googleai into client code
// This package internally contains API key validation patterns
→ "AIza" pattern detected in client bundle → Build fails
```

### **After (FIXED)**
```javascript
// Webpack now excludes AI packages from client bundles
// Only server-side code can access these modules
→ No AI code in client bundle → No API key patterns → Build succeeds
```

---

## 📋 Verification Checklist

After deploying with cleared cache, verify:

- [ ] Build completes without errors
- [ ] No "AIza***" patterns detected in scan
- [ ] Secrets scanning shows 0 instances
- [ ] Application still works (test AI features)
- [ ] Dashboard AI chat still functions
- [ ] Survey analysis still works

---

## 🛠️ Troubleshooting

### If cache clear doesn't work:

1. **Delete `.next` folder** locally and rebuild:
   ```bash
   rm -rf .next .netlify
   npm run build
   ```

2. **Check if AI code is accidentally imported client-side**:
   ```bash
   # Search for any client-side AI imports
   grep -r "import.*genkit" src/components/
   grep -r "import.*@genkit-ai" src/components/
   ```

3. **Verify environment variables**:
   - `GOOGLE_API_KEY` should ONLY be in Netlify env vars
   - NOT in `.env` (only template values there)
   - NOT in any committed files

4. **Nuclear option - Create new site**:
   - If cache persists, create a fresh Netlify site
   - Connect to same repo
   - Set environment variables
   - Deploy fresh (no cached data)

---

## 🔐 Prevention

To prevent this in the future:

1. **Never log API keys or patterns**
   ```javascript
   // ❌ DON'T
   console.log('API key starts with:', key.substring(0, 4));
   
   // ✅ DO
   console.log('API key exists:', !!key);
   ```

2. **Keep AI code server-side only**
   - Always use `'use server'` directive
   - Use dynamic imports for AI modules
   - Never import in component files

3. **Test builds before deploying**
   ```bash
   npm run build
   # Check output for any "AIza" patterns
   grep -r "AIza" .next/
   ```

4. **Monitor Netlify builds**
   - Watch for secrets scanning warnings
   - Address immediately before merging

---

## 📞 Support

If you continue to see this error after clearing cache:

1. Check this guide's troubleshooting section
2. Verify all steps were followed
3. Contact Netlify support if cache won't clear

---

## ✨ Expected Result

After following these steps:

```
✓ Build completed successfully
✓ Secrets scanning: 0 instances of secrets found
✓ Deploy successful
✓ AI features working correctly
```

**The build should now succeed!** 🎉

