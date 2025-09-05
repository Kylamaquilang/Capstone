import dotenv from 'dotenv';
import { getTransporter, verifyEmailConfig } from '../utils/emailService.js';

dotenv.config();

async function testEmailConnection() {
  try {
    console.log('🧪 Testing email configuration...');
    
    // Check environment variables
    console.log('📧 EMAIL_USER:', process.env.EMAIL_USER ? '✅ Set' : '❌ Missing');
    console.log('🔐 EMAIL_PASSWORD:', process.env.EMAIL_PASSWORD ? '✅ Set' : '❌ Missing');
    
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.error('❌ Missing email environment variables');
      console.log('Please add EMAIL_USER and EMAIL_PASSWORD to your .env file');
      return;
    }
    
    // Verify configuration
    verifyEmailConfig();
    console.log('✅ Email configuration verified');
    
    // Test connection
    console.log('🔌 Testing SMTP connection...');
    await getTransporter().verify();
    console.log('✅ SMTP connection successful');
    
    console.log('\n🎉 Email service is ready!');
    console.log('You can now use password reset and password change features.');
    
  } catch (error) {
    console.error('❌ Email test failed:', error.message);
    
    if (error.message.includes('EMAIL_USER not configured') || error.message.includes('EMAIL_PASSWORD not configured')) {
      console.log('\n🔧 Solution:');
      console.log('1. Add EMAIL_USER and EMAIL_PASSWORD to your .env file');
      console.log('2. Use your Gmail address and App Password');
      console.log('3. See EMAIL_SETUP_GUIDE.md for detailed instructions');
    } else if (error.code === 'EAUTH') {
      console.log('\n🔧 Solution:');
      console.log('1. Enable 2-Factor Authentication on your Gmail account');
      console.log('2. Generate an App Password (not your regular password)');
      console.log('3. Use the 16-character App Password in EMAIL_PASSWORD');
    } else if (error.code === 'ECONNECTION') {
      console.log('\n🔧 Solution:');
      console.log('1. Check your internet connection');
      console.log('2. Verify Gmail SMTP settings');
      console.log('3. Try again in a few minutes');
    }
  }
}

// Run the test
testEmailConnection();
