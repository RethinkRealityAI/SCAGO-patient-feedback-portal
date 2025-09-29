# Security Configuration for Patient Feedback Portal

## 🔐 API Key Security

### Current Configuration
- **Google AI API Key**: Stored in `GOOGLE_API_KEY` environment variable
- **Firebase Keys**: Public keys (safe to expose) stored in `NEXT_PUBLIC_*` variables
- **Environment Files**: 
  - `.env` - Template file with placeholder values
  - `.env.local` - Contains actual keys (excluded from git)

### Security Measures Implemented

#### ✅ Server-Side Only API Usage
- All Gemini API calls are made server-side using `'use server'` directives
- No API keys are exposed to the client-side JavaScript
- Genkit configuration runs on the server only

#### ✅ Environment Variable Security
- API keys are stored in environment variables, not hardcoded
- `.env.local` is excluded from version control via `.gitignore`
- Template `.env` file contains placeholder values only

#### ✅ Netlify Configuration
- Removed `GOOGLE_API_KEY` from `SECRETS_SCAN_OMIT_KEYS` to enable secret scanning
- Only Firebase public keys are allowed in build output

### 🔧 Required Actions

#### 1. Environment Variables Setup
```bash
# Copy the template and add your actual values
cp .env .env.local

# Edit .env.local with your actual API keys
# DO NOT commit .env.local to version control
```

#### 2. Netlify Environment Variables
Set the following environment variables in your Netlify dashboard:
- `GOOGLE_API_KEY` - Your Google AI API key
- All Firebase `NEXT_PUBLIC_*` variables

#### 3. Verify Security
- Ensure `.env.local` is in `.gitignore` ✅
- Verify no API keys are hardcoded in source code ✅
- Confirm all AI calls are server-side only ✅

### 🚨 Security Best Practices

1. **Never commit API keys** to version control
2. **Use environment variables** for all sensitive data
3. **Rotate API keys** regularly
4. **Monitor API usage** for unusual activity
5. **Use least privilege** - limit API key permissions

### 🔍 Security Audit Checklist

- [ ] `.env.local` is in `.gitignore`
- [ ] No hardcoded API keys in source code
- [ ] All AI calls are server-side only
- [ ] Environment variables are properly set in production
- [ ] API key permissions are minimal
- [ ] Regular key rotation schedule

### 📞 Incident Response

If you suspect your API key has been compromised:
1. **Immediately rotate** the API key in Google Cloud Console
2. **Update** the environment variable in all environments
3. **Review** API usage logs for unauthorized access
4. **Consider** implementing API rate limiting

---
*Last updated: $(date)*
*Security review: API keys properly secured*
