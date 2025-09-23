#!/bin/bash
# Quick Database Fix Script
# This script will help fix common database issues

echo "🔧 Quick Database Fix Script"
echo "=============================="

# Check if we're in the right directory
if [ ! -f "capstone_database_schema.sql" ]; then
    echo "❌ capstone_database_schema.sql not found in current directory"
    echo "💡 Make sure you're in the project root directory"
    exit 1
fi

# Check if MySQL is running
echo "📋 Checking MySQL service..."
if ! pgrep -x "mysqld" > /dev/null; then
    echo "❌ MySQL is not running. Starting MySQL..."
    
    # Try to start MySQL (different commands for different systems)
    if command -v brew >/dev/null 2>&1; then
        # macOS
        brew services start mysql
    elif command -v systemctl >/dev/null 2>&1; then
        # Linux
        sudo systemctl start mysql
    elif command -v net >/dev/null 2>&1; then
        # Windows (if running in Git Bash)
        net start mysql
    else
        echo "❌ Cannot start MySQL automatically. Please start MySQL manually."
        echo "   Windows: Start MySQL service from Services"
        echo "   macOS: brew services start mysql"
        echo "   Linux: sudo systemctl start mysql"
        exit 1
    fi
    
    # Wait a moment for MySQL to start
    sleep 3
fi

echo "✅ MySQL service is running"

# Create database and tables
echo "🗄️ Setting up database..."

# Check if .env file exists
if [ ! -f "api/.env" ]; then
    echo "📝 Creating .env file..."
    cat > api/.env << EOF
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
EOF
    echo "✅ .env file created"
else
    echo "✅ .env file already exists"
fi

# Try to create database and tables
echo "🔨 Creating database and tables..."

# Method 1: Try using mysql command
if command -v mysql >/dev/null 2>&1; then
    echo "📊 Using mysql command to create database..."
    
    # Create database
    mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS capstone CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>/dev/null
    
    if [ $? -eq 0 ]; then
        echo "✅ Database created successfully"
        
        # Import schema
        mysql -u root -p capstone < capstone_database_schema.sql 2>/dev/null
        
        if [ $? -eq 0 ]; then
            echo "✅ Database schema imported successfully"
        else
            echo "⚠️ Schema import failed. You may need to enter MySQL password."
            echo "💡 Try running: mysql -u root -p capstone < capstone_database_schema.sql"
        fi
    else
        echo "⚠️ Database creation failed. You may need to enter MySQL password."
        echo "💡 Try running: mysql -u root -p"
        echo "   Then: CREATE DATABASE capstone;"
        echo "   Then: USE capstone;"
        echo "   Then: SOURCE capstone_database_schema.sql;"
    fi
else
    echo "❌ mysql command not found"
    echo "💡 Please install MySQL client or run the schema manually"
fi

# Verify database setup
echo "🔍 Verifying database setup..."
cd api
if [ -f "src/scripts/verify_database.js" ]; then
    node src/scripts/verify_database.js
else
    echo "⚠️ Database verification script not found"
fi

echo ""
echo "🎉 Database fix script completed!"
echo ""
echo "Next steps:"
echo "1. Start your API server: cd api && npm start"
echo "2. Test the connection: curl http://localhost:5000/api/orders/test-db"
echo "3. Check sales data: curl http://localhost:5000/api/orders/sales-performance/public"
