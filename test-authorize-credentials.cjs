#!/usr/bin/env node

/**
 * Quick Authorize.Net Credentials Test
 * 
 * This script allows you to quickly test Authorize.Net credentials
 * without configuring the database first.
 * 
 * Usage:
 *   node test-authorize-credentials.cjs <API_LOGIN_ID> <TRANSACTION_KEY> [testMode]
 * 
 * Example:
 *   node test-authorize-credentials.cjs 5KP3u95bQpv 346HZ32z3fP4hTG2 true
 */

const axios = require('axios');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const log = {
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  step: (msg) => console.log(`${colors.cyan}🔍 ${msg}${colors.reset}`),
};

async function testCredentials() {
  console.log('\n' + '='.repeat(60));
  console.log('  AUTHORIZE.NET CREDENTIALS TEST');
  console.log('='.repeat(60) + '\n');

  // Parse command line arguments
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    log.error('Missing required arguments');
    console.log('\nUsage:');
    console.log('  node test-authorize-credentials.cjs <API_LOGIN_ID> <TRANSACTION_KEY> [testMode]\n');
    console.log('Example:');
    console.log('  node test-authorize-credentials.cjs 5KP3u95bQpv 346HZ32z3fP4hTG2 true\n');
    console.log('Arguments:');
    console.log('  API_LOGIN_ID     - Your Authorize.Net API Login ID');
    console.log('  TRANSACTION_KEY  - Your Authorize.Net Transaction Key');
    console.log('  testMode         - true for sandbox, false for production (default: true)\n');
    process.exit(1);
  }

  const apiLoginId = args[0];
  const transactionKey = args[1];
  const testMode = args[2] !== 'false'; // Default to true unless explicitly set to false

  // Validate inputs
  if (apiLoginId.length < 5) {
    log.error('API Login ID seems too short (should be at least 5 characters)');
    process.exit(1);
  }

  if (transactionKey.length < 5) {
    log.error('Transaction Key seems too short (should be at least 5 characters)');
    process.exit(1);
  }

  console.log('Configuration:');
  console.log('-'.repeat(60));
  console.log(`API Login ID:     ${apiLoginId.substring(0, 4)}***`);
  console.log(`Transaction Key:  ${transactionKey.substring(0, 4)}***`);
  console.log(`Mode:             ${testMode ? '🧪 Sandbox (Test)' : '🏭 Production (Live)'}`);
  console.log('-'.repeat(60) + '\n');

  // Test credentials
  log.step('Testing credentials with Authorize.Net...');

  const serverUrl = process.env.VITE_API_BASE_URL || 'http://localhost:4001';

  try {
    const response = await axios.post(`${serverUrl}/test-authorize`, {
      apiLoginId: apiLoginId,
      transactionKey: transactionKey,
      testMode: testMode
    }, {
      timeout: 10000 // 10 second timeout
    });

    if (response.data.success) {
      console.log('\n' + '='.repeat(60));
      log.success('CREDENTIALS ARE VALID!');
      console.log('='.repeat(60));
      
      if (response.data.merchantName) {
        log.info(`Merchant Name: ${response.data.merchantName}`);
      }
      
      log.info(`Environment: ${testMode ? 'Sandbox (Test Mode)' : 'Production (Live Mode)'}`);
      
      if (testMode) {
        console.log('\n' + '-'.repeat(60));
        console.log('  TEST CARD NUMBERS');
        console.log('-'.repeat(60));
        console.log('Visa:              4111111111111111');
        console.log('Mastercard:        5424000000000015');
        console.log('American Express:  378282246310005');
        console.log('\nExpiry: Any future date (e.g., 12/25)');
        console.log('CVV:    Any 3-4 digits (e.g., 123)');
        console.log('-'.repeat(60));
      }
      
      console.log('\n✅ You can now use these credentials in your application');
      console.log('   Configure them in: Admin Dashboard → Settings → Payments\n');
      
    } else {
      console.log('\n' + '='.repeat(60));
      log.error('CREDENTIALS ARE INVALID');
      console.log('='.repeat(60));
      log.error(`Reason: ${response.data.message}`);
      console.log('\nPossible issues:');
      console.log('  • Wrong API Login ID or Transaction Key');
      console.log('  • Credentials are for different environment (sandbox vs production)');
      console.log('  • Account is inactive or suspended');
      console.log('  • Extra spaces or characters in credentials\n');
      process.exit(1);
    }

  } catch (error) {
    console.log('\n' + '='.repeat(60));
    log.error('TEST FAILED');
    console.log('='.repeat(60));
    
    if (error.response) {
      log.error(`Server error: ${error.response.data.message || error.message}`);
      if (error.response.data.details) {
        log.info(`Details: ${error.response.data.details}`);
      }
    } else if (error.code === 'ECONNREFUSED') {
      log.error('Cannot connect to server');
      log.info(`Make sure server is running at ${serverUrl}`);
      log.info('Run: cd server && npm start');
    } else if (error.code === 'ECONNABORTED') {
      log.error('Request timeout - server took too long to respond');
      log.info('Check if server is running and responding');
    } else {
      log.error(`Error: ${error.message}`);
    }
    
    console.log('');
    process.exit(1);
  }
}

// Run the test
testCredentials().catch(error => {
  log.error(`Fatal error: ${error.message}`);
  process.exit(1);
});
