# ☁️ Google Cloud Platform (GCP) Hosting Strategy

## 🎁 GCP Free Tier Overview

Google Cloud offers **$300 free credits** for 90 days + **Always Free** tier for certain services.

### Always Free Tier (After Credits Expire)

- **Cloud Run:** 2 million requests/month
- **Cloud Functions:** 2 million invocations/month
- **Compute Engine:** 1 f1-micro VM (US regions only)
- **Cloud Storage:** 5 GB storage
- **Firestore/Datastore:** 1 GB storage + 50K reads/day
- **Cloud Build:** 120 build-minutes/day

---

## 🏗️ Architecture Options for GCP

### **Option 1: Cloud Run (RECOMMENDED - Serverless)**

```
┌─────────────────────────────────────────┐
│  Frontend (Firebase Hosting)            │
│  - Static React build                   │
│  - Free SSL + CDN                       │
│  - https://your-app.web.app             │
└─────────────────┬───────────────────────┘
                  │
                  │ API Calls
                  ▼
┌─────────────────────────────────────────┐
│  Backend (Cloud Run)                    │
│  - Containerized Node.js                │
│  - Auto-scaling (0 to N)                │
│  - Pay per request                      │
│  - https://backend-xxx.run.app          │
└─────────────────┬───────────────────────┘
                  │
                  │ MongoDB Connection
                  ▼
┌─────────────────────────────────────────┐
│  Database (MongoDB Atlas)               │
│  - M0 Free Tier (512 MB)                │
│  - Or GCP Marketplace MongoDB           │
└─────────────────────────────────────────┘
```

**Cost:** FREE for low-medium traffic (within free tier)

---

### **Option 2: Compute Engine (Traditional VM)**

```
┌─────────────────────────────────────────┐
│  Frontend (Firebase Hosting)            │
│  - Static React build                   │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│  Backend (f1-micro VM)                  │
│  - 1 free VM (US regions)               │
│  - 0.6 GB RAM                           │
│  - 30 GB HDD                            │
│  - Nginx + Node.js + PM2                │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│  Database (MongoDB Atlas)               │
│  - M0 Free Tier                         │
└─────────────────────────────────────────┘
```

**Cost:** FREE (Always Free tier)

---

### **Option 3: App Engine (PaaS)**

```
┌─────────────────────────────────────────┐
│  Frontend (Firebase Hosting)            │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│  Backend (App Engine Standard)          │
│  - Node.js runtime                      │
│  - Auto-scaling                         │
│  - 28 instance hours/day free           │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│  Database (MongoDB Atlas)               │
└─────────────────────────────────────────┘
```

**Cost:** FREE for low traffic

---

## 🎯 RECOMMENDED: Cloud Run + Firebase Hosting

**Why This Combo?**

- ✅ Completely serverless (no server management)
- ✅ Auto-scales from 0 to infinity
- ✅ Pay only for actual usage
- ✅ Free SSL certificates
- ✅ Global CDN
- ✅ Easy deployment
- ✅ No cold starts (can configure min instances)

---

## 📋 Step-by-Step Deployment Guide

### Prerequisites

1. **Create GCP Account**

   - Go to https://cloud.google.com/
   - Sign up (requires credit card but won't charge without permission)
   - Get $300 free credits for 90 days

2. **Install Google Cloud CLI**

   ```bash
   # Windows (PowerShell as Admin)
   (New-Object Net.WebClient).DownloadFile("https://dl.google.com/dl/cloudsdk/channels/rapid/GoogleCloudSDKInstaller.exe", "$env:Temp\GoogleCloudSDKInstaller.exe")
   & $env:Temp\GoogleCloudSDKInstaller.exe
   ```

3. **Install Docker Desktop**
   - Download from https://www.docker.com/products/docker-desktop
   - Required for Cloud Run

---

## 🚀 PART 1: Deploy Backend to Cloud Run

### Step 1: Prepare Backend for Cloud Run

1. **Create Dockerfile in project root:**

```dockerfile
# Dockerfile
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Expose port
EXPOSE 8080

# Start application
CMD ["node", "server/index.js"]
```

2. **Create .dockerignore:**

```
node_modules
npm-debug.log
.env
.git
.gitignore
README.md
Landing_page
dist
uploads
*.md
```

3. **Update server/index.js for Cloud Run:**

```javascript
// Cloud Run uses PORT environment variable
const PORT = process.env.PORT || 8080;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
});
```

4. **Create cloudbuild.yaml (optional - for CI/CD):**

```yaml
steps:
  # Build the container image
  - name: "gcr.io/cloud-builders/docker"
    args: ["build", "-t", "gcr.io/$PROJECT_ID/restaurant-backend", "."]

  # Push the container image to Container Registry
  - name: "gcr.io/cloud-builders/docker"
    args: ["push", "gcr.io/$PROJECT_ID/restaurant-backend"]

  # Deploy container image to Cloud Run
  - name: "gcr.io/google.com/cloudsdktool/cloud-sdk"
    entrypoint: gcloud
    args:
      - "run"
      - "deploy"
      - "restaurant-backend"
      - "--image"
      - "gcr.io/$PROJECT_ID/restaurant-backend"
      - "--region"
      - "us-central1"
      - "--platform"
      - "managed"
      - "--allow-unauthenticated"

images:
  - "gcr.io/$PROJECT_ID/restaurant-backend"
```

---

### Step 2: Deploy to Cloud Run

1. **Initialize gcloud:**

   ```bash
   gcloud init
   # Follow prompts to login and select/create project
   ```

2. **Set project:**

   ```bash
   gcloud config set project YOUR_PROJECT_ID
   ```

3. **Enable required APIs:**

   ```bash
   gcloud services enable run.googleapis.com
   gcloud services enable containerregistry.googleapis.com
   gcloud services enable cloudbuild.googleapis.com
   ```

4. **Build and deploy:**

   ```bash
   # Build container
   gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/restaurant-backend

   # Deploy to Cloud Run
   gcloud run deploy restaurant-backend \
     --image gcr.io/YOUR_PROJECT_ID/restaurant-backend \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated \
     --port 8080 \
     --memory 512Mi \
     --cpu 1 \
     --min-instances 0 \
     --max-instances 10 \
     --set-env-vars "NODE_ENV=production"
   ```

5. **Set environment variables:**

   ```bash
   gcloud run services update restaurant-backend \
     --region us-central1 \
     --set-env-vars "MONGODB_URI=mongodb+srv://..." \
     --set-env-vars "JWT_SECRET=your-secret" \
     --set-env-vars "JWT_REFRESH_SECRET=your-refresh-secret" \
     --set-env-vars "CLIENT_URL=https://your-app.web.app" \
     --set-env-vars "APP_NAME=Restaurant QR Menu"
   ```

6. **Get your backend URL:**

   ```bash
   gcloud run services describe restaurant-backend --region us-central1 --format 'value(status.url)'
   ```

   Example: `https://restaurant-backend-xxx-uc.a.run.app`

---

## 🌐 PART 2: Deploy Frontend to Firebase Hosting

### Step 1: Setup Firebase

1. **Install Firebase CLI:**

   ```bash
   npm install -g firebase-tools
   ```

2. **Login to Firebase:**

   ```bash
   firebase login
   ```

3. **Initialize Firebase in your project:**

   ```bash
   firebase init
   ```

   Select:

   - ✅ Hosting
   - Create new project or use existing
   - Public directory: `dist`
   - Single-page app: `Yes`
   - GitHub auto-deploy: `No` (for now)

4. **This creates firebase.json:**
   ```json
   {
     "hosting": {
       "public": "dist",
       "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
       "rewrites": [
         {
           "source": "**",
           "destination": "/index.html"
         }
       ],
       "headers": [
         {
           "source": "**/*.@(jpg|jpeg|gif|png|svg|webp|js|css)",
           "headers": [
             {
               "key": "Cache-Control",
               "value": "max-age=31536000"
             }
           ]
         }
       ]
     }
   }
   ```

---

### Step 2: Build and Deploy Frontend

1. **Create production environment file:**

Create `.env.production`:

```env
VITE_API_URL=https://restaurant-backend-xxx-uc.a.run.app
```

2. **Build the frontend:**

   ```bash
   npm run build
   ```

3. **Deploy to Firebase:**

   ```bash
   firebase deploy --only hosting
   ```

4. **Get your frontend URL:**
   ```
   Hosting URL: https://your-project-id.web.app
   ```

---

### Step 3: Update Backend CORS

Update backend environment variables with your Firebase URL:

```bash
gcloud run services update restaurant-backend \
  --region us-central1 \
  --update-env-vars "CLIENT_URL=https://your-project-id.web.app,FRONTEND_URL=https://your-project-id.web.app"
```

---

## 🗄️ Database Options on GCP

### Option 1: MongoDB Atlas (RECOMMENDED)

- Use free M0 tier as described in FREE_HOSTING_STRATEGY.md
- Best performance and features
- **Cost:** FREE

### Option 2: Cloud Firestore (Native GCP)

- NoSQL document database
- 1 GB storage free
- 50K reads, 20K writes, 20K deletes per day
- Would require code changes from MongoDB
- **Cost:** FREE tier available

### Option 3: Cloud SQL (PostgreSQL/MySQL)

- Relational database
- Would require complete code rewrite
- No free tier (starts at ~$10/month)
- **Cost:** NOT FREE

### Option 4: MongoDB on Compute Engine

- Install MongoDB on free f1-micro VM
- Limited by 0.6 GB RAM
- Manual management required
- **Cost:** FREE but complex

**Recommendation:** Stick with MongoDB Atlas M0 free tier

---

## 💰 Cost Breakdown (GCP)

### During First 90 Days (with $300 credits):

- Everything is essentially free
- Can use larger instances
- Experiment freely

### After 90 Days (Always Free Tier):

| Service          | Free Tier                          | Usage Estimate | Cost         |
| ---------------- | ---------------------------------- | -------------- | ------------ |
| Cloud Run        | 2M requests/month                  | ~100K requests | $0           |
| Firebase Hosting | 10 GB storage, 360 MB/day transfer | ~5 GB          | $0           |
| MongoDB Atlas    | 512 MB                             | Database       | $0           |
| Cloud Build      | 120 min/day                        | ~30 min/day    | $0           |
| **TOTAL**        |                                    |                | **$0/month** |

### If Exceeding Free Tier:

- Cloud Run: ~$0.40 per million requests
- Firebase Hosting: $0.15/GB after 10 GB
- Typical cost for 1M requests: **$5-15/month**

---

## 🔧 Advanced Configuration

### Enable Cloud CDN for Backend

```bash
# Create backend service with CDN
gcloud compute backend-services create restaurant-backend-cdn \
  --global \
  --enable-cdn
```

### Set up Custom Domain

1. **In Firebase Console:**

   - Hosting → Add custom domain
   - Follow DNS verification steps

2. **For Cloud Run:**
   ```bash
   gcloud beta run domain-mappings create \
     --service restaurant-backend \
     --domain api.yourdomain.com \
     --region us-central1
   ```

### Configure Cloud Armor (DDoS Protection)

```bash
gcloud compute security-policies create restaurant-security \
  --description "Security policy for restaurant app"

gcloud compute security-policies rules create 1000 \
  --security-policy restaurant-security \
  --expression "origin.region_code == 'CN'" \
  --action "deny-403"
```

### Set up Cloud Monitoring

```bash
# Enable monitoring
gcloud services enable monitoring.googleapis.com

# Create uptime check
gcloud monitoring uptime create restaurant-backend-check \
  --resource-type=uptime-url \
  --host=restaurant-backend-xxx-uc.a.run.app \
  --path=/health
```

---

## 🚀 CI/CD with Cloud Build

### Automatic Deployment on Git Push

1. **Connect GitHub repository:**

   ```bash
   gcloud builds triggers create github \
     --repo-name=RESTAURANT-SYSTEM-2 \
     --repo-owner=YashDave11 \
     --branch-pattern="^main$" \
     --build-config=cloudbuild.yaml
   ```

2. **Now every push to main branch auto-deploys!**

---

## 📊 Monitoring & Logging

### View Logs

```bash
# Cloud Run logs
gcloud run services logs read restaurant-backend --region us-central1

# Follow logs in real-time
gcloud run services logs tail restaurant-backend --region us-central1
```

### View Metrics

```bash
# Open Cloud Console
gcloud console
# Navigate to Cloud Run → restaurant-backend → Metrics
```

### Set up Alerts

```bash
# Alert on high error rate
gcloud alpha monitoring policies create \
  --notification-channels=CHANNEL_ID \
  --display-name="High Error Rate" \
  --condition-display-name="Error rate > 5%" \
  --condition-threshold-value=0.05
```

---

## 🔒 Security Best Practices

### 1. Use Secret Manager for Sensitive Data

```bash
# Enable Secret Manager
gcloud services enable secretmanager.googleapis.com

# Create secrets
echo -n "your-mongodb-uri" | gcloud secrets create mongodb-uri --data-file=-
echo -n "your-jwt-secret" | gcloud secrets create jwt-secret --data-file=-

# Grant Cloud Run access
gcloud secrets add-iam-policy-binding mongodb-uri \
  --member=serviceAccount:YOUR_SERVICE_ACCOUNT \
  --role=roles/secretmanager.secretAccessor

# Update Cloud Run to use secrets
gcloud run services update restaurant-backend \
  --region us-central1 \
  --set-secrets="MONGODB_URI=mongodb-uri:latest,JWT_SECRET=jwt-secret:latest"
```

### 2. Enable VPC Connector (for private MongoDB)

```bash
# Create VPC connector
gcloud compute networks vpc-access connectors create restaurant-connector \
  --region us-central1 \
  --range 10.8.0.0/28

# Update Cloud Run to use connector
gcloud run services update restaurant-backend \
  --region us-central1 \
  --vpc-connector restaurant-connector
```

### 3. Set up Cloud Armor

```bash
# Create security policy
gcloud compute security-policies create restaurant-policy

# Add rate limiting rule
gcloud compute security-policies rules create 100 \
  --security-policy restaurant-policy \
  --expression "true" \
  --action "rate-based-ban" \
  --rate-limit-threshold-count 1000 \
  --rate-limit-threshold-interval-sec 60
```

---

## 🎯 Comparison: GCP vs Other Platforms

| Feature           | GCP Cloud Run               | Render.com         | Vercel             |
| ----------------- | --------------------------- | ------------------ | ------------------ |
| **Free Tier**     | 2M requests/month           | 750 hours/month    | 100 GB bandwidth   |
| **Cold Starts**   | ~1-2 seconds                | 15-30 seconds      | None (frontend)    |
| **Auto-scaling**  | Yes (0 to N)                | No (free tier)     | Yes                |
| **Custom Domain** | Yes (free SSL)              | Yes (free SSL)     | Yes (free SSL)     |
| **CI/CD**         | Cloud Build                 | GitHub auto-deploy | GitHub auto-deploy |
| **Monitoring**    | Built-in (Cloud Monitoring) | Basic              | Basic              |
| **Complexity**    | Medium                      | Low                | Low                |
| **Best For**      | Production apps             | Quick prototypes   | Frontend apps      |

---

## 📈 Scaling on GCP

### Phase 1: Free Tier (0-10K users/month)

```bash
gcloud run services update restaurant-backend \
  --min-instances 0 \
  --max-instances 5 \
  --memory 512Mi \
  --cpu 1
```

**Cost:** $0/month

### Phase 2: Growing (10K-100K users/month)

```bash
gcloud run services update restaurant-backend \
  --min-instances 1 \
  --max-instances 20 \
  --memory 1Gi \
  --cpu 2
```

**Cost:** ~$20-50/month

### Phase 3: Production (100K+ users/month)

```bash
gcloud run services update restaurant-backend \
  --min-instances 3 \
  --max-instances 100 \
  --memory 2Gi \
  --cpu 4
```

**Cost:** ~$100-300/month

---

## 🛠️ Useful GCP Commands

```bash
# View all Cloud Run services
gcloud run services list

# Describe service
gcloud run services describe restaurant-backend --region us-central1

# Update service
gcloud run services update restaurant-backend --region us-central1 --memory 1Gi

# Delete service
gcloud run services delete restaurant-backend --region us-central1

# View logs
gcloud run services logs read restaurant-backend --region us-central1 --limit 50

# Get service URL
gcloud run services describe restaurant-backend --region us-central1 --format 'value(status.url)'

# List all projects
gcloud projects list

# Switch project
gcloud config set project PROJECT_ID

# View billing
gcloud billing accounts list
```

---

## 🎓 Learning Resources

- **Cloud Run Docs:** https://cloud.google.com/run/docs
- **Firebase Hosting:** https://firebase.google.com/docs/hosting
- **GCP Free Tier:** https://cloud.google.com/free
- **Cloud Build:** https://cloud.google.com/build/docs
- **Secret Manager:** https://cloud.google.com/secret-manager/docs

---

## ✅ Deployment Checklist

### Backend (Cloud Run)

- [ ] Dockerfile created
- [ ] .dockerignore configured
- [ ] PORT environment variable set to 8080
- [ ] gcloud CLI installed and authenticated
- [ ] Project created in GCP Console
- [ ] APIs enabled (Cloud Run, Container Registry, Cloud Build)
- [ ] Container built and pushed
- [ ] Service deployed to Cloud Run
- [ ] Environment variables configured
- [ ] MongoDB Atlas connection string added
- [ ] CORS configured with frontend URL
- [ ] Health check endpoint working
- [ ] Custom domain configured (optional)

### Frontend (Firebase Hosting)

- [ ] Firebase CLI installed
- [ ] Firebase project initialized
- [ ] firebase.json configured
- [ ] .env.production created with backend URL
- [ ] Production build created (npm run build)
- [ ] Deployed to Firebase Hosting
- [ ] Custom domain configured (optional)
- [ ] SSL certificate active

### Database (MongoDB Atlas)

- [ ] Cluster created (M0 free tier)
- [ ] Database user created
- [ ] IP whitelist configured
- [ ] Connection string obtained
- [ ] Database seeded with initial data

### Monitoring

- [ ] Cloud Monitoring enabled
- [ ] Uptime checks configured
- [ ] Alerts set up
- [ ] Logs accessible

---

## 🎉 Summary

**GCP Cloud Run + Firebase Hosting is perfect for:**

- ✅ Production-ready applications
- ✅ Auto-scaling requirements
- ✅ Global CDN needs
- ✅ Advanced monitoring and logging
- ✅ Enterprise-grade security
- ✅ CI/CD pipelines

**Total Setup Time:** 2-3 hours
**Monthly Cost:** $0 (within free tier)
**Scalability:** Can handle 10K-100K+ users

**Your restaurant system will be:**

- 🌍 Globally distributed
- 🚀 Lightning fast
- 📈 Auto-scaling
- 🔒 Secure
- 💰 Cost-effective
