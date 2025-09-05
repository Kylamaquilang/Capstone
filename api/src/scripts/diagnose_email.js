import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

dotenv.config();

async function diagnoseEmailIssue() {
  console.log('🔍 Diagnosing Gmail authentication issue...\n');
  
  // Check environment variables
  console.log('📧 EMAIL_USER:', process.env.EMAIL_USER);
  console.log('🔐 EMAIL_PASSWORD:', process.env.EMAIL_PASSWORD ? '***' + process.env.EMAIL_PASSWORD.slice(-4) : 'NOT SET');
  console.log('📏 Password length:', process.env.EMAIL_PASSWORD ? process.env.EMAIL_PASSWORD.length : 0);
  
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    console.error('❌ Missing email credentials in .env file');
    return;
  }
  
  // Test different configurations
  const configs = [
    {
      name: 'Current Configuration',
      config: {
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD
        }
      }
    },
    {
      name: 'Gmail SMTP with Port 465',
      config: {
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD
        }
      }
    },
    {
      name: 'Gmail SMTP with Port 587',
      config: {
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD
        },
        tls: {
          rejectUnauthorized: false
        }
      }
    }
  ];
  
  for (const { name, config } of configs) {
    console.log(`\n🧪 Testing: ${name}`);
    try {
      const transporter = nodemailer.createTransport(config);
      await transporter.verify();
      console.log(`✅ ${name} - SUCCESS!`);
      console.log('🎉 This configuration works!');
      return;
    } catch (error) {
      console.log(`❌ ${name} - FAILED`);
      console.log(`   Error: ${error.message}`);
      
      if (error.code === 'EAUTH') {
        console.log('   🔧 This is an authentication issue');
        console.log('   💡 Possible solutions:');
        console.log('      - Verify 2FA is enabled on Gmail account');
        console.log('      - Check App Password is correct');
        console.log('      - Ensure App Password is for "Mail" service');
      }
    }
  }
  
  console.log('\n🔧 Manual Verification Steps:');
  console.log('1. Go to https://myaccount.google.com/security');
  console.log('2. Ensure "2-Step Verification" is ON');
  console.log('3. Go to "App passwords"');
  console.log('4. Generate a new App Password for "Mail"');
  console.log('5. Copy the 16-character password (no spaces)');
  console.log('6. Update EMAIL_PASSWORD in .env file');
  console.log('7. Restart your server');
}

diagnoseEmailIssue();
