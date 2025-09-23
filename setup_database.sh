#!/bin/bash
# Database Setup Script for Capstone Project
# Run this script to set up your database and environment

echo "🚀 Setting up Capstone Database..."

# Check if MySQL is running
echo "📋 Checking MySQL service..."
if ! pgrep -x "mysqld" > /dev/null; then
    echo "❌ MySQL is not running. Please start MySQL service first."
    echo "   Windows: Start MySQL service from Services"
    echo "   macOS: brew services start mysql"
    echo "   Linux: sudo systemctl start mysql"
    exit 1
fi

echo "✅ MySQL service is running"

# Create .env file if it doesn't exist
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

# Install dependencies
echo "📦 Installing API dependencies..."
cd api
npm install

# Run database setup
echo "🗄️ Setting up database..."
node src/scripts/setup_database.js

echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Update api/.env with your actual database credentials"
echo "2. Start the API server: cd api && npm start"
echo "3. Start the client: cd client && npm run dev"
