import dotenv from 'dotenv';
import { sendPasswordResetEmail, generateVerificationCode } from '../utils/emailService.js';

dotenv.config();

async function testEmail() {
  try {
    console.log('🧪 Testing email functionality...');
    
    // Check environment variables
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.error('❌ Missing email environment variables');
      console.log('Please set EMAIL_USER and EMAIL_PASSWORD in your .env file');
      return;
    }

    console.log('✅ Email credentials found');
    console.log('📧 From:', process.env.EMAIL_USER);
    
    // Generate test verification code
    const testCode = generateVerificationCode();
    console.log('🔐 Test verification code:', testCode);
    
    // Test email sending
    console.log('📤 Sending test email...');
    const result = await sendPasswordResetEmail(
      process.env.EMAIL_USER, // Send to yourself for testing
      testCode,
      'Test User'
    );
    
    console.log('✅ Test email sent successfully!');
    console.log('📧 Message ID:', result.messageId);
    console.log('📬 Check your inbox for the test email');
    
  } catch (error) {
    console.error('❌ Email test failed:', error.message);
    console.log('\n🔧 Troubleshooting tips:');
    console.log('1. Check your Gmail app password is correct');
    console.log('2. Ensure 2FA is enabled on your Gmail account');
    console.log('3. Verify your .env file has correct credentials');
    console.log('4. Check if Gmail is blocking the connection');
  }
}

// Run the test
testEmail();




