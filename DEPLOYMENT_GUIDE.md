# 🚀 CPC ESSEN Deployment Guide

## Quick Start (Development)

### 1. Database Setup
```bash
# Create database
mysql -u root -p < api/src/schema/complete_database_schema.sql

# Or manually:
mysql -u root -p
CREATE DATABASE capstone;
USE capstone;
SOURCE api/src/schema/complete_database_schema.sql;
```

### 2. Environment Configuration
```bash
cd api
cp env.example .env
# Edit .env with your actual values
```

### 3. Install Dependencies
```bash
# Backend
cd api
npm install

# Frontend
cd client
npm install
```

### 4. Start Development Servers
```bash
# Terminal 1 - Backend
cd api
npm run dev

# Terminal 2 - Frontend
cd client
npm run dev
```

---

## 🌐 Production Deployment

### Option 1: Heroku (Easiest, Free Tier Available)

#### Prerequisites
- Heroku account
- Heroku CLI installed

#### Steps

**1. Prepare Your Code**
```bash
# Add Procfile to api directory
echo "web: node server.js" > api/Procfile

# Ensure package.json has start script
# "start": "node server.js"
```

**2. Create Heroku Apps**
```bash
# Backend
heroku create your-app-name-api
heroku addons:create cleardb:ignite  # Free MySQL addon

# Frontend (if deploying separately)
heroku create your-app-name-frontend
```

**3. Configure Environment Variables**
```bash
# Get database URL
heroku config:get CLEARDB_DATABASE_URL

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET="$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")"
heroku config:set JWT_EXPIRES_IN=24h
heroku config:set FRONTEND_URL=https://your-frontend-app.herokuapp.com

# Parse CLEARDB_DATABASE_URL and set individual DB vars
# URL format: mysql://user:pass@host/dbname?reconnect=true
heroku config:set DB_HOST=your_host
heroku config:set DB_USER=your_user
heroku config:set DB_PASSWORD=your_password
heroku config:set DB_NAME=your_dbname
```

**4. Deploy**
```bash
cd api
git init
git add .
git commit -m "Initial commit"
heroku git:remote -a your-app-name-api
git push heroku main
```

**5. Initialize Database**
```bash
# Run schema on Heroku database
heroku run bash
mysql -h your_host -u your_user -p your_dbname < src/schema/complete_database_schema.sql
```

**6. Scale & Monitor**
```bash
heroku ps:scale web=1
heroku logs --tail
```

---

### Option 2: Railway.app (Modern, Easy)

#### Steps

**1. Connect Repository**
- Go to https://railway.app
- Click "New Project" → "Deploy from GitHub"
- Select your repository

**2. Add MySQL Database**
- Click "New" → "Database" → "Add MySQL"
- Railway will automatically set DATABASE_URL

**3. Configure Environment Variables**
- Click on your service → "Variables"
- Add all variables from env.example

**4. Deploy**
- Railway deploys automatically
- Click "Deploy" button if needed

**5. Run Database Migration**
- Go to service settings → "Deploy" tab
- Use the shell to run schema

---

### Option 3: DigitalOcean (More Control)

#### Prerequisites
- DigitalOcean account
- Domain name (optional)

#### Steps

**1. Create Droplet**
- Ubuntu 22.04 LTS
- Basic plan ($4-6/month)
- Add SSH key

**2. Initial Server Setup**
```bash
ssh root@your_server_ip

# Update system
apt update && apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt install -y nodejs

# Install MySQL
apt install -y mysql-server
mysql_secure_installation

# Install PM2 (process manager)
npm install -g pm2

# Install Nginx (web server)
apt install -y nginx
```

**3. Setup Application**
```bash
# Create app user
adduser --disabled-password appuser
su - appuser

# Clone repository
git clone your_repo_url
cd Capstone/api

# Install dependencies
npm install --production

# Copy and configure .env
cp env.example .env
nano .env
```

**4. Setup Database**
```bash
mysql -u root -p
CREATE DATABASE capstone;
CREATE USER 'capstone_user'@'localhost' IDENTIFIED BY 'strong_password';
GRANT ALL PRIVILEGES ON capstone.* TO 'capstone_user'@'localhost';
FLUSH PRIVILEGES;
USE capstone;
SOURCE src/schema/complete_database_schema.sql;
EXIT;
```

**5. Configure PM2**
```bash
# Start application
pm2 start server.js --name "cpc-essen-api"

# Save PM2 config
pm2 save

# Setup PM2 to start on reboot
pm2 startup
# Run the command it outputs
```

**6. Configure Nginx**
```bash
sudo nano /etc/nginx/sites-available/cpc-essen

# Add this configuration:
```

```nginx
server {
    listen 80;
    server_name your_domain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/cpc-essen /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

**7. Setup SSL (Free with Let's Encrypt)**
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your_domain.com
```

---

## 🔒 Security Checklist Before Going Live

- [ ] Strong JWT_SECRET generated and set
- [ ] Database credentials are strong
- [ ] CORS configured with specific domain
- [ ] HTTPS/SSL enabled
- [ ] Rate limiting configured
- [ ] Environment variables properly set
- [ ] No sensitive data in code
- [ ] .env file NOT in git
- [ ] Database backups configured
- [ ] Firewall configured (if self-hosted)

---

## 📊 Post-Deployment Checklist

- [ ] Test all authentication flows
- [ ] Test product operations
- [ ] Test order placement
- [ ] Test file uploads
- [ ] Test email notifications
- [ ] Check error logging
- [ ] Monitor server resources
- [ ] Set up uptime monitoring
- [ ] Document admin procedures
- [ ] Train admin users

---

## 🐛 Troubleshooting

### Database Connection Failed
```bash
# Check if MySQL is running
sudo systemctl status mysql

# Check connection from command line
mysql -h DB_HOST -u DB_USER -p

# Verify environment variables
echo $DB_HOST
echo $DB_USER
```

### Application Won't Start
```bash
# Check logs
pm2 logs cpc-essen-api

# Check environment variables
pm2 env 0

# Restart application
pm2 restart cpc-essen-api
```

### File Uploads Not Working
- Check uploads directory permissions
- Verify UPLOAD_DIR in environment
- Check disk space: `df -h`
- Consider using cloud storage for production

### Email Not Sending
- Verify EMAIL_* environment variables
- Check SMTP credentials
- Look for email errors in logs
- Consider using SendGrid or AWS SES

---

## 📈 Monitoring & Maintenance

### Setup Uptime Monitoring
- **UptimeRobot** (free): https://uptimerobot.com
- **Pingdom** (free tier): https://www.pingdom.com

### Setup Error Tracking
```bash
npm install @sentry/node

# Add to server.js
import * as Sentry from '@sentry/node';
Sentry.init({ dsn: process.env.SENTRY_DSN });
```

### Database Backups
```bash
# Manual backup
mysqldump -u DB_USER -p DB_NAME > backup_$(date +%Y%m%d).sql

# Automated daily backup (crontab)
0 2 * * * mysqldump -u DB_USER -p'PASSWORD' DB_NAME > /backups/db_$(date +\%Y\%m\%d).sql
```

### Log Rotation
```bash
# Configure PM2 log rotation
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

---

## 🆘 Support & Resources

- **Documentation**: Check README.md and code comments
- **Database Schema**: See `api/src/schema/complete_database_schema.sql`
- **Deployment Assessment**: See `DEPLOYMENT_READINESS_ASSESSMENT.md`

---

## 🎓 For Your Capstone Defense

**Be prepared to explain:**
1. Why you chose Node.js + MySQL
2. Security measures implemented
3. Scalability considerations
4. Backup and recovery strategy
5. Monitoring approach

**Demo checklist:**
1. User registration and login
2. Product browsing and ordering
3. Admin product management
4. Inventory management
5. Order processing
6. Real-time notifications

**Good luck!** 🍀

