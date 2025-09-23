# 🚨 URGENT: Fix Sales Performance 500 Error

## The Problem
You're getting a 500 error when trying to access the sales performance data. This is likely because:
1. Database tables don't exist
2. Database connection issues
3. Missing data in tables

## 🔧 IMMEDIATE FIX STEPS

### Step 1: Check if your API server is running
```bash
# Open a new terminal and check if API is running
curl http://localhost:5000/api/orders/test-db
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Database connected successfully",
  "test": {"test": 1}
}
```

### Step 2: If Step 1 fails, fix database connection

**Create `.env` file in `api` folder:**
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=capstone
DB_PORT=3306
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=24h
DEFAULT_STUDENT_PASSWORD=cpc123
NODE_ENV=development
PORT=5000
```

### Step 3: Create database and tables

**Option A: Using MySQL command line**
```bash
# Connect to MySQL
mysql -u root -p

# In MySQL, run these commands:
CREATE DATABASE capstone CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE capstone;
SOURCE capstone_database_schema.sql;
```

**Option B: Using the setup script**
```bash
cd api
node src/scripts/setup_database.js
```

### Step 4: Test the sales endpoint
```bash
curl "http://localhost:5000/api/orders/sales-performance/public"
```

**Expected Response:**
```json
{
  "salesData": [],
  "topProducts": [],
  "paymentBreakdown": [],
  "inventorySummary": [],
  "salesLogsSummary": {},
  "summary": {
    "total_orders": 0,
    "total_revenue": null,
    "avg_order_value": null
  }
}
```

### Step 5: If still getting errors, check server logs

**Start your API server with verbose logging:**
```bash
cd api
npm start
```

Look for error messages in the console that start with:
- `❌ Database connection failed`
- `📊 Sales performance request received`
- `📊 Executing sales data query...`

## 🔍 DEBUGGING COMMANDS

### Check if MySQL is running:
```bash
# Windows
net start mysql

# macOS
brew services start mysql

# Linux
sudo systemctl start mysql
```

### Test MySQL connection:
```bash
mysql -u root -p -e "SELECT 1;"
```

### Check if database exists:
```bash
mysql -u root -p -e "SHOW DATABASES LIKE 'capstone';"
```

### Check if tables exist:
```bash
mysql -u root -p capstone -e "SHOW TABLES;"
```

## 🚀 QUICK FIX SCRIPT

Run this in your project root:

```bash
# Create .env file
cat > api/.env << 'EOF'
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=capstone
DB_PORT=3306
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=24h
DEFAULT_STUDENT_PASSWORD=cpc123
NODE_ENV=development
PORT=5000
EOF

# Create database
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS capstone CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# Import schema
mysql -u root -p capstone < capstone_database_schema.sql

# Test connection
curl http://localhost:5000/api/orders/test-db
```

## 📞 EMERGENCY CONTACT

If none of these steps work, please share:
1. The exact error message from your API server console
2. The result of `curl http://localhost:5000/api/orders/test-db`
3. Whether MySQL is running (`mysql --version`)

## ✅ SUCCESS INDICATORS

You'll know it's working when:
- `curl http://localhost:5000/api/orders/test-db` returns success
- `curl http://localhost:5000/api/orders/sales-performance/public` returns data (even if empty)
- Your frontend sales page loads without errors
