# SiteAnalyzer Pro - Production-Ready SaaS

A professional website analysis tool with subscription management, credit system, and API access.

## 🚀 Quick Start

### Local Development
```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Start the server
npm start

# Visit http://localhost:3000
```

## 📦 Deployment Options

### Option 1: Deploy to Vercel (Recommended for Frontend)
```bash
npm install -g vercel
vercel
```

### Option 2: Deploy to Heroku
```bash
# Install Heroku CLI
# Create new app
heroku create your-app-name

# Set environment variables
heroku config:set JWT_SECRET=your-secret-key
heroku config:set SESSION_SECRET=your-session-secret
heroku config:set NODE_ENV=production

# Deploy
git add .
git commit -m "Deploy to Heroku"
git push heroku main
```

### Option 3: Deploy to Railway
1. Connect GitHub repo at railway.app
2. Add environment variables in dashboard
3. Deploy automatically on push

### Option 4: VPS (DigitalOcean, AWS, etc.)
```bash
# SSH into server
ssh root@your-server-ip

# Clone repo
git clone your-repo-url
cd website-analyzer

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2
npm install -g pm2

# Install dependencies
npm install

# Setup environment
cp .env.example .env
nano .env  # Edit with your values

# Start with PM2
pm2 start server.js --name siteanalyzer
pm2 save
pm2 startup
```

## 🔧 Production Setup

### 1. Database (Choose One)

**SQLite (Default - Good for <1000 users)**
- Already configured, no changes needed

**PostgreSQL (Recommended for production)**
```bash
# Install PostgreSQL adapter
npm install pg

# Update DATABASE_URL in .env
DATABASE_URL=postgresql://user:pass@host:5432/dbname
```

### 2. Stripe Setup
1. Create account at stripe.com
2. Get API keys from dashboard
3. Add to .env file
4. Set up webhook endpoint: `your-domain.com/api/webhooks/stripe`

### 3. Domain & SSL
- Point domain to server IP
- Use Cloudflare for free SSL
- Or use Let's Encrypt: `sudo certbot --nginx`

### 4. Security Checklist
- [ ] Change all secret keys in .env
- [ ] Enable HTTPS only
- [ ] Set up firewall (ufw or cloud provider)
- [ ] Enable rate limiting (already configured)
- [ ] Regular backups of database
- [ ] Monitor with UptimeRobot or similar

## 💰 Monetization

### Current Pricing Structure
- **Free**: 3 analyses/month ($0)
- **Professional**: 50 analyses/month ($29)
- **Enterprise**: Unlimited ($99)

### Revenue Projections
- 100 users: ~$500/month (10% paid)
- 1000 users: ~$5,000/month
- 10000 users: ~$50,000/month

## 📊 Features

### For Users
- Real-time website analysis
- SEO, Performance, Security checks
- Dashboard with history
- Export reports (JSON/HTML/PDF)
- API access for developers

### For Admins
- User management via database
- Subscription tracking
- Usage analytics
- Automatic credit reset

## 🛠 Tech Stack
- **Backend**: Node.js, Express
- **Database**: SQLite/PostgreSQL
- **Auth**: JWT + bcrypt
- **Analysis**: Puppeteer
- **Payments**: Stripe
- **Deployment**: Vercel/Heroku/VPS

## 📈 Scaling Tips

1. **Cache Analysis Results**: Store for 24 hours to reduce load
2. **Queue System**: Use Bull/Redis for background jobs
3. **CDN**: CloudFlare for static assets
4. **Database**: Move to PostgreSQL at 1000+ users
5. **Monitoring**: New Relic or DataDog

## 🐛 Troubleshooting

### Puppeteer Issues on Linux
```bash
# Install dependencies
sudo apt-get install -y \
  libnss3 libatk-bridge2.0-0 libdrm2 \
  libxcomposite1 libxdamage1 libxfixes3 \
  libxrandr2 libgbm1 libxss1 libgtk-3-0
```

### Database Locked
- Restart server
- Check file permissions
- Consider PostgreSQL for production

### High Memory Usage
- Limit Puppeteer instances
- Add swap space on server
- Upgrade server RAM

## 📝 License
MIT - Use for any purpose

## 🤝 Support
For deployment help or custom features, contact: your-email@example.com