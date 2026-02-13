#!/usr/bin/env node

/**
 * Authorize.Net Payment Transaction Test
 * 
 * This script performs an actual test transaction using the Authorize.Net sandbox
 * to verify the complete payment flow.
 */

const axios = require('axios');
require('dotenv').config({ path: 'server/.env' });

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

const log = {
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  step: (msg) => console.log(`${colors.cyan}🔍 ${msg}${colors.reset}`),
  test: (msg) => console.log(`${colors.magenta}🧪 ${msg}${colors.reset}`),
};

// Test card data
const testCards = {
  visa: {
    number: '4111111111111111',
    type: 'Visa',
    cvv: '123',
    expiry: '12/25'
  },
  mastercard: {
    number: '5424000000000015',
    type: 'Mastercard',
    cvv: '123',
    expiry: '12/25'
  },
  amex: {
    number: '378282246310005',
    type: 'American Express',
    cvv: '1234',
    expiry: '12/25'
  }
};

async function testPaymentTransaction() {
  console.log('\n' + '='.repeat(70));
  console.log('  AUTHORIZE.NET PAYMENT TRANSACTION TEST');
  console.log('='.repeat(70) + '\n');

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    log.error('Missing Supabase credentials');
    log.info('Make sure SUPABASE_URL and SUPABASE_ANON_KEY are set in server/.env');
    process.exit(1);
  }

  // Test with Visa card
  const testCard = testCards.visa;
  const testAmount = 10.00;

  console.log('Test Transaction Details:');
  console.log('-'.repeat(70));
  console.log(`Card Type:        ${testCard.type}`);
  console.log(`Card Number:      ${testCard.number}`);
  console.log(`Expiry:           ${testCard.expiry}`);
  console.log(`CVV:              ${testCard.cvv}`);
  console.log(`Amount:           $${testAmount.toFixed(2)}`);
  console.log('-'.repeat(70) + '\n');

  // Step 1: Test the Supabase Edge Function
  log.step('Step 1: Testing payment processing via Supabase Edge Function...');

  try {
    const paymentData = {
      payment: {
        type: 'card',
        cardNumber: testCard.number,
        expirationDate: testCard.expiry.replace('/', ''), // Convert 12/25 to 1225
        cvv: testCard.cvv
      },
      amount: testAmount,
      invoiceNumber: 'TEST-' + Date.now(),
      customerEmail: 'test@example.com',
      billing: {
        firstName: 'Test',
        lastName: 'Customer',
        address: '123 Test Street',
        city: 'Test City',
        state: 'CA',
        zip: '12345',
        country: 'USA'
      }
    };

    log.test('Sending payment request to Supabase Edge Function...');

    const response = await axios.post(
      `${SUPABASE_URL}/functions/v1/process-payment`,
      paymentData,
      {
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    console.log('\n' + '='.repeat(70));
    console.log('  PAYMENT RESPONSE');
    console.log('='.repeat(70));

    if (response.data.success) {
      log.success('PAYMENT SUCCESSFUL!');
      console.log('\nTransaction Details:');
      console.log('-'.repeat(70));
      console.log(`Transaction ID:   ${response.data.transactionId || 'N/A'}`);
      console.log(`Auth Code:        ${response.data.authCode || 'N/A'}`);
      console.log(`Amount:           $${testAmount.toFixed(2)}`);
      console.log(`Status:           ${response.data.status || 'Approved'}`);
      console.log(`Message:          ${response.data.message || 'Transaction approved'}`);
      
      if (response.data.avsResultCode) {
        console.log(`AVS Result:       ${response.data.avsResultCode}`);
      }
      if (response.data.cvvResultCode) {
        console.log(`CVV Result:       ${response.data.cvvResultCode}`);
      }
      
      console.log('-'.repeat(70));

      // Additional details
      if (response.data.customerProfileId) {
        console.log('\nCustomer Profile:');
        console.log(`Profile ID:       ${response.data.customerProfileId}`);
        if (response.data.paymentProfileId) {
          console.log(`Payment Profile:  ${response.data.paymentProfileId}`);
        }
      }

    } else {
      log.error('PAYMENT FAILED');
      console.log('\nError Details:');
      console.log('-'.repeat(70));
      console.log(`Error Code:       ${response.data.errorCode || 'N/A'}`);
      console.log(`Error Message:    ${response.data.errorMessage || response.data.message || 'Unknown error'}`);
      console.log('-'.repeat(70));
    }

    console.log('\n' + '='.repeat(70));
    console.log('  RAW RESPONSE DATA');
    console.log('='.repeat(70));
    console.log(JSON.stringify(response.data, null, 2));
    console.log('='.repeat(70) + '\n');

  } catch (error) {
    console.log('\n' + '='.repeat(70));
    log.error('PAYMENT TEST FAILED');
    console.log('='.repeat(70));

    if (error.response) {
      console.log('\nError Response:');
      console.log('-'.repeat(70));
      console.log(`Status Code:      ${error.response.status}`);
      console.log(`Status Text:      ${error.response.statusText}`);
      console.log('\nResponse Data:');
      console.log(JSON.stringify(error.response.data, null, 2));
      console.log('-'.repeat(70));
    } else if (error.code === 'ECONNREFUSED') {
      log.error('Cannot connect to Supabase');
      log.info('Make sure Supabase URL is correct and accessible');
    } else if (error.code === 'ECONNABORTED') {
      log.error('Request timeout');
      log.info('The payment processing took too long');
    } else {
      console.log('\nError Details:');
      console.log('-'.repeat(70));
      console.log(`Error:            ${error.message}`);
      if (error.stack) {
        console.log('\nStack Trace:');
        console.log(error.stack);
      }
      console.log('-'.repeat(70));
    }
    console.log('');
  }

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('  TEST SUMMARY');
  console.log('='.repeat(70));
  log.info('Test completed. Check the results above.');
  log.info('If successful, the transaction should appear in your Authorize.Net sandbox dashboard.');
  log.info('Dashboard: https://sandbox.authorize.net/');
  console.log('='.repeat(70) + '\n');
}

// Run the test
testPaymentTransaction().catch(error => {
  log.error(`Fatal error: ${error.message}`);
  process.exit(1);
});
