import dotenv from 'dotenv';

dotenv.config();

console.log('🔍 Environment Variables Check:');
console.log('EMAIL_USER:', process.env.EMAIL_USER);
console.log('EMAIL_PASSWORD:', process.env.EMAIL_PASSWORD ? '***' + process.env.EMAIL_PASSWORD.slice(-4) : 'NOT SET');
console.log('EMAIL_PASSWORD length:', process.env.EMAIL_PASSWORD ? process.env.EMAIL_PASSWORD.length : 0);
console.log('MAIL_PASSWORD:', process.env.MAIL_PASSWORD ? '***' + process.env.MAIL_PASSWORD.slice(-4) : 'NOT SET');
console.log('MAIL_PASSWORD length:', process.env.MAIL_PASSWORD ? process.env.MAIL_PASSWORD.length : 0);
