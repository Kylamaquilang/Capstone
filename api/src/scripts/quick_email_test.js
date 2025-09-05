import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

dotenv.config();

async function quickEmailTest() {
  console.log('🧪 Quick Email Test');
  console.log('📧 EMAIL_USER:', process.env.EMAIL_USER);
  console.log('🔐 EMAIL_PASSWORD length:', process.env.EMAIL_PASSWORD ? process.env.EMAIL_PASSWORD.length : 0);
  
  if (process.env.EMAIL_PASSWORD && process.env.EMAIL_PASSWORD.length !== 16) {
    console.log('⚠️  WARNING: App Password should be exactly 16 characters');
    console.log('   Current length:', process.env.EMAIL_PASSWORD.length);
    console.log('   Remove spaces from your App Password');
  }
  
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });
    
    await transporter.verify();
    console.log('✅ SUCCESS! Email authentication working!');
    console.log('🎉 You can now use password reset and password change features.');
    
  } catch (error) {
    console.log('❌ FAILED:', error.message);
    
    if (error.code === 'EAUTH') {
      console.log('\n🔧 Fix Steps:');
      console.log('1. Go to https://myaccount.google.com/security');
      console.log('2. Ensure 2-Step Verification is ON');
      console.log('3. Go to "App passwords" → "Mail" → "Other"');
      console.log('4. Generate new App Password');
      console.log('5. Copy 16-character password (remove spaces)');
      console.log('6. Update EMAIL_PASSWORD in .env file');
      console.log('7. Run this test again');
    }
  }
}

quickEmailTest();
