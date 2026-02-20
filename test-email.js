// Simple email test script
const mailSender = require('./server/utils/mailSender');

async function testEmail() {
  console.log('🧪 Testing email configuration...');
  
  // Test with a simple email
  const result = await mailSender(
    'test@example.com', // Replace with your email for testing
    'Test Email from 9RX',
    '<h1>Test Email</h1><p>If you receive this, email is working!</p>'
  );
  
  console.log('📧 Email test result:', result);
  
  if (result.success) {
    console.log('✅ Email configuration is working!');
  } else {
    console.log('❌ Email configuration has issues:', result.error);
  }
}

testEmail().catch(console.error);