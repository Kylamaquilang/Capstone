@echo off
REM Database Setup Script for Capstone Project (Windows)
REM Run this script to set up your database and environment

echo 🚀 Setting up Capstone Database...

REM Check if MySQL is running
echo 📋 Checking MySQL service...
sc query mysql >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ MySQL service not found or not running.
    echo    Please start MySQL service from Services or install MySQL first.
    pause
    exit /b 1
)

echo ✅ MySQL service is running

REM Create .env file if it doesn't exist
if not exist "api\.env" (
    echo 📝 Creating .env file...
    (
        echo # Database Configuration
        echo DB_HOST=localhost
        echo DB_USER=root
        echo DB_PASSWORD=
        echo DB_NAME=capstone
        echo DB_PORT=3306
        echo.
        echo # JWT Configuration
        echo JWT_SECRET=your_jwt_secret_key_here_change_this_in_production
        echo JWT_EXPIRES_IN=24h
        echo.
        echo # Email Configuration ^(for notifications^)
        echo EMAIL_USER=your_email@gmail.com
        echo EMAIL_PASS=your_app_password
        echo CLIENT_URL=http://localhost:3000
        echo.
        echo # PayMongo Configuration ^(for GCash payments^)
        echo PAYMONGO_SECRET_KEY=your_paymongo_secret_key
        echo PAYMONGO_PUBLIC_KEY=your_paymongo_public_key
        echo.
        echo # Default Student Password
        echo DEFAULT_STUDENT_PASSWORD=cpc123
        echo.
        echo # Server Configuration
        echo NODE_ENV=development
        echo PORT=5000
    ) > api\.env
    echo ✅ .env file created
) else (
    echo ✅ .env file already exists
)

REM Install dependencies
echo 📦 Installing API dependencies...
cd api
call npm install

REM Run database setup
echo 🗄️ Setting up database...
call node src/scripts/setup_database.js

echo 🎉 Setup complete!
echo.
echo Next steps:
echo 1. Update api\.env with your actual database credentials
echo 2. Start the API server: cd api ^&^& npm start
echo 3. Start the client: cd client ^&^& npm run dev
pause
