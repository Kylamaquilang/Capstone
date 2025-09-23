# 🔧 Database Connection Troubleshooting Guide

## Current Issue: `connect ETIMEDOUT`

Your application is getting timeout errors when trying to connect to the database. Here's how to fix it:

## 🚨 **Immediate Fixes**

### 1. **Fix Database Port (CRITICAL)**
The main issue is that your database configuration is using port `5000` instead of `3306`.

**✅ Already Fixed:** Updated `api/src/database/db.js` to use port `3306`

### 2. **Create Environment File**
Create `api/.env` file with the following content:

```env
# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=capstone
DB_PORT=3306

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_here_change_this_in_production
JWT_EXPIRES_IN=24h

# Email Configuration (for notifications)
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
CLIENT_URL=http://localhost:3000

# PayMongo Configuration (for GCash payments)
PAYMONGO_SECRET_KEY=your_paymongo_secret_key
PAYMONGO_PUBLIC_KEY=your_paymongo_public_key

# Default Student Password
DEFAULT_STUDENT_PASSWORD=cpc123

# Server Configuration
NODE_ENV=development
PORT=5000
```

### 3. **Verify MySQL is Running**
Check if MySQL service is running:

**Windows:**
```cmd
# Check MySQL service
sc query mysql

# Start MySQL service
net start mysql
```

**macOS:**
```bash
# Check if MySQL is running
brew services list | grep mysql

# Start MySQL
brew services start mysql
```

**Linux:**
```bash
# Check MySQL status
sudo systemctl status mysql

# Start MySQL
sudo systemctl start mysql
```

## 🗄️ **Database Setup Steps**

### Step 1: Create Database
Run the database setup script:

```bash
# Navigate to API directory
cd api

# Run database setup
node src/scripts/setup_database.js
```

### Step 2: Alternative - Manual Database Creation
If the script fails, create the database manually:

```sql
-- Connect to MySQL
mysql -u root -p

-- Create database
CREATE DATABASE capstone CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Use the database
USE capstone;

-- Run the schema file
SOURCE capstone_database_schema.sql;
```

## 🔍 **Testing Database Connection**

### Test 1: Direct MySQL Connection
```bash
# Test MySQL connection
mysql -u root -p -h localhost -P 3306

# If successful, you should see MySQL prompt
```

### Test 2: Node.js Connection Test
Create a test file `test_db.js`:

```javascript
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const testConnection = async () => {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'capstone',
      port: process.env.DB_PORT || 3306,
    });
    
    console.log('✅ Database connected successfully');
    await connection.end();
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
  }
};

testConnection();
```

Run the test:
```bash
node test_db.js
```

## 🚀 **Start Your Application**

### 1. Start API Server
```bash
cd api
npm start
```

### 2. Start Client
```bash
cd client
npm run dev
```

## 🔧 **Common Issues & Solutions**

### Issue: `ER_ACCESS_DENIED_ERROR`
**Solution:** Check your MySQL username and password in `.env`

### Issue: `ER_BAD_DB_ERROR`
**Solution:** Database doesn't exist. Run the setup script.

### Issue: `ECONNREFUSED`
**Solution:** MySQL service is not running. Start MySQL service.

### Issue: `ETIMEDOUT`
**Solution:** Wrong port or MySQL not running. Check port 3306.

### Issue: `ER_NO_SUCH_TABLE`
**Solution:** Tables not created. Run the database schema.

## 📋 **Verification Checklist**

- [ ] MySQL service is running
- [ ] Database port is 3306 (not 5000)
- [ ] `.env` file exists with correct credentials
- [ ] Database `capstone` exists
- [ ] All tables are created
- [ ] API server starts without errors
- [ ] Login works without timeout errors

## 🆘 **If Still Having Issues**

1. **Check MySQL Error Logs:**
   - Windows: `C:\ProgramData\MySQL\MySQL Server X.X\Data\*.err`
   - macOS: `/usr/local/var/mysql/*.err`
   - Linux: `/var/log/mysql/error.log`

2. **Test with MySQL Workbench or phpMyAdmin**

3. **Check firewall settings** (if using remote MySQL)

4. **Verify MySQL user permissions:**
   ```sql
   SHOW GRANTS FOR 'root'@'localhost';
   ```

## 📞 **Quick Commands**

```bash
# Check if MySQL is running
netstat -an | findstr :3306

# Test connection
telnet localhost 3306

# Restart MySQL (Windows)
net stop mysql && net start mysql

# Check MySQL version
mysql --version
```
