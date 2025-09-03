import dotenv from 'dotenv';

dotenv.config();

console.log('🔧 Testing PayMongo Configuration...\n');

// Check environment variables
const PAYMONGO_SECRET_KEY = process.env.PAYMONGO_SECRET_KEY;
const PAYMONGO_PUBLIC_KEY = process.env.PAYMONGO_PUBLIC_KEY;
const CLIENT_URL = process.env.CLIENT_URL;

console.log('Environment Variables:');
console.log(`✅ PAYMONGO_SECRET_KEY: ${PAYMONGO_SECRET_KEY ? 'Set' : '❌ Missing'}`);
console.log(`✅ PAYMONGO_PUBLIC_KEY: ${PAYMONGO_PUBLIC_KEY ? 'Set' : '❌ Missing'}`);
console.log(`✅ CLIENT_URL: ${CLIENT_URL || 'http://localhost:3000'}`);

if (!PAYMONGO_SECRET_KEY || !PAYMONGO_PUBLIC_KEY) {
  console.log('\n❌ PayMongo configuration is incomplete!');
  console.log('Please add the following to your .env file:');
  console.log('PAYMONGO_SECRET_KEY=sk_test_your_secret_key_here');
  console.log('PAYMONGO_PUBLIC_KEY=pk_test_your_public_key_here');
  console.log('\nYou can get these keys from your PayMongo dashboard.');
} else {
  console.log('\n✅ PayMongo configuration looks good!');
  console.log('Make sure to use test keys for development and live keys for production.');
}

console.log('\n📋 Next Steps:');
console.log('1. Set up PayMongo account at https://paymongo.com');
console.log('2. Get your API keys from the dashboard');
console.log('3. Add the keys to your .env file');
console.log('4. Test the payment flow with test cards');
