# Email Setup Guide - Fix Gmail Authentication Issues

## Problem Identified
Your application is failing to send emails because:
1. Missing `EMAIL_USER` and `EMAIL_PASSWORD` environment variables
2. Gmail authentication is not properly configured

## Solution Steps

### Step 1: Update your `.env` file
Add these lines to your `api/.env` file:

```env
# Email Configuration (Gmail)
EMAIL_USER=your-actual-email@gmail.com
EMAIL_PASSWORD=your-16-character-app-password
CLIENT_URL=http://localhost:3000
```

### Step 2: Set up Gmail App Password

1. **Enable 2-Factor Authentication** on your Gmail account:
   - Go to [Google Account Security](https://myaccount.google.com/security)
   - Enable "2-Step Verification" if not already enabled

2. **Generate App Password**:
   - Go to [Google Account Security](https://myaccount.google.com/security)
   - Click on "App passwords" (under "2-Step Verification")
   - Select "Mail" and "Other (Custom name)"
   - Enter "CPC Essen App" as the name
   - Copy the 16-character password (format: xxxx xxxx xxxx xxxx)

3. **Update your .env file**:
   ```env
   EMAIL_USER=your-actual-email@gmail.com
   EMAIL_PASSWORD=your-16-character-app-password
   ```

### Step 3: Test Email Configuration

Run the email test script:
```bash
cd api
node src/scripts/test_email.js
```

### Step 4: Restart Your Server

After updating the `.env` file:
```bash
cd api
npm start
```

## Common Issues and Solutions

### Issue: "Username and Password not accepted"
**Solution**: 
- Make sure you're using the App Password, not your regular Gmail password
- Ensure 2FA is enabled on your Gmail account
- Verify the email address is correct

### Issue: "Less secure app access"
**Solution**: 
- Don't use "Less secure app access" - use App Passwords instead
- App Passwords are more secure and recommended by Google

### Issue: "Connection timeout"
**Solution**:
- Check your internet connection
- Verify Gmail SMTP settings are correct
- Try using a different network if behind a corporate firewall

## Email Templates Fixed

The following email functionalities will work after setup:
- ✅ Password reset emails
- ✅ Password change confirmation emails  
- ✅ Welcome emails for new users
- ✅ Verification code emails

## Security Notes

- Never commit your `.env` file to version control
- Keep your App Password secure
- Regularly rotate your App Password
- Use a dedicated Gmail account for your application if possible

## Testing

After setup, test these features:
1. Request password reset
2. Change password from user profile
3. User registration (if applicable)

If you encounter any issues, check the server logs for detailed error messages.
