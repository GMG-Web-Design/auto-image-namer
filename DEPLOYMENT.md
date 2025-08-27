# 🚀 Deployment Guide - Auto Image Namer

## 📋 **Prerequisites**
- [Vercel Account](https://vercel.com/signup)
- [GitHub Account](https://github.com/signup)
- OpenAI API Key
- Perplexity API Key

## 🔐 **Step 1: Set Up Authentication**

### Generate Password Hash
```bash
node -e "console.log(require('bcryptjs').hashSync('YOUR_PASSWORD', 10))"
```

### Environment Variables for Production
Add these to your Vercel project settings:

```bash
# API Keys
OPENAI_API_KEY=your_openai_api_key_here
PERPLEXITY_API_KEY=your_perplexity_api_key_here

# Authentication
ADMIN_USERNAME=your_username
ADMIN_PASSWORD_HASH=your_bcrypt_hash_from_above
SESSION_SECRET=your_very_secure_random_string_here

# Environment
NODE_ENV=production
```

## 🌐 **Step 2: Deploy to Vercel**

### Option A: GitHub Integration (Recommended)
1. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "Add authentication and Vercel config"
   git push origin main
   ```

2. **Connect to Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Click "Import Project"
   - Select your GitHub repository
   - Configure environment variables (see Step 1)
   - Click "Deploy"

### Option B: Vercel CLI
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables
vercel env add OPENAI_API_KEY
vercel env add PERPLEXITY_API_KEY
vercel env add ADMIN_USERNAME
vercel env add ADMIN_PASSWORD_HASH
vercel env add SESSION_SECRET
vercel env add NODE_ENV

# Redeploy with environment variables
vercel --prod
```

## ⚙️ **Step 3: Configure Environment Variables**

In your Vercel dashboard:
1. Go to your project
2. Click "Settings" → "Environment Variables"
3. Add all the variables from Step 1

## 🔒 **Step 4: Security Recommendations**

### For Production:
1. **Change default credentials:**
   - Use a strong username (not "admin")
   - Generate a complex password
   - Use the bcrypt hash generator above

2. **Secure session secret:**
   ```bash
   # Generate a secure session secret
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```

3. **Environment-specific settings:**
   ```bash
   NODE_ENV=production  # Enables secure cookies
   ```

## 🎯 **Step 5: Test Deployment**

1. **Visit your Vercel URL** (home page is now the login screen)
2. **Login with your credentials**
3. **Should redirect to `/imageanalysis`**
4. **Test image analysis functionality**

## 📊 **Vercel Configuration Details**

The `vercel.json` file configures:
- **Serverless function** for Node.js
- **5-minute timeout** for long analyses
- **Route handling** for SPA behavior

## ⚠️ **Important Notes**

### Limitations on Vercel:
- **File storage is temporary** (analyses lost on cold starts)
- **Queue is in-memory** (resets on function restarts)
- **No persistent sessions** across serverless functions

### Recommendations:
- For production, consider upgrading to:
  - **Database storage** (PostgreSQL, MongoDB)
  - **Redis for sessions** and queues
  - **File storage service** (AWS S3, Cloudinary)

## 🔧 **Troubleshooting**

### Common Issues:
1. **"Function timeout"** → Large batches may exceed 5min limit
2. **"Session expired"** → Normal on serverless cold starts
3. **"Queue disappeared"** → Expected behavior on function restart

### Solutions:
- Reduce batch sizes for large uploads
- Re-login after extended inactivity
- Monitor queue status during processing

## 🎊 **You're Live!**

Your Auto Image Namer is now deployed with:
- ✅ **Authentication protection**
- ✅ **API key security**
- ✅ **Professional login page**
- ✅ **Queue management**
- ✅ **Analysis history**

**Login Credentials:**
- Username: `team@gmgwebdesign.com`
- Password: `gmgiconicwebhq`

**🔒 These are the production credentials for GMG Web Design team access.** 