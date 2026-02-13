#!/usr/bin/env node

/**
 * Direct Authorize.Net API Test
 * Tests payment directly against Authorize.Net API
 */

const axios = require('axios');

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
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  step: (msg) => console.log(`${colors.cyan}🔍 ${msg}${colors.reset}`),
};

async function testDirectPayment() {
  console.log('\n' + '='.repeat(70));
  console.log('  DIRECT AUTHORIZE.NET API TEST');
  console.log('='.repeat(70) + '\n');

  const API_LOGIN_ID = '5KP3u95bQpv';
  const TRANSACTION_KEY = '346HZ32z3fP4hTG2';
  const SANDBOX_URL = 'https://apitest.authorize.net/xml/v1/request.api';

  const testAmount = '10.00';
  const testCard = {
    number: '4111111111111111',
    expiry: '2028-12',
    cvv: '123'
  };

  console.log('Test Details:');
  console.log('-'.repeat(70));
  console.log(`API Login ID:     ${API_LOGIN_ID.substring(0, 4)}***`);
  console.log(`Transaction Key:  ${TRANSACTION_KEY.substring(0, 4)}***`);
  console.log(`Card Number:      ${testCard.number}`);
  console.log(`Expiry:           ${testCard.expiry}`);
  console.log(`Amount:           $${testAmount}`);
  console.log('-'.repeat(70) + '\n');

  log.step('Sending payment request to Authorize.Net sandbox...');

  const requestBody = {
    createTransactionRequest: {
      merchantAuthentication: {
        name: API_LOGIN_ID,
        transactionKey: TRANSACTION_KEY
      },
      refId: 'TEST' + Date.now(),
      transactionRequest: {
        transactionType: 'authCaptureTransaction',
        amount: testAmount,
        payment: {
          creditCard: {
            cardNumber: testCard.number,
            expirationDate: testCard.expiry,
            cardCode: testCard.cvv
          }
        },
        billTo: {
          firstName: 'Test',
          lastName: 'Customer',
          address: '123 Test Street',
          city: 'Test City',
          state: 'CA',
          zip: '12345',
          country: 'USA'
        }
      }
    }
  };

  try {
    const response = await axios.post(SANDBOX_URL, requestBody, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    console.log('\n' + '='.repeat(70));
    console.log('  RESPONSE FROM AUTHORIZE.NET');
    console.log('='.repeat(70));

    const result = response.data;

    if (result.messages?.resultCode === 'Ok') {
      log.success('PAYMENT SUCCESSFUL!');
      
      const txn = result.transactionResponse;
      console.log('\nTransaction Details:');
      console.log('-'.repeat(70));
      console.log(`Transaction ID:   ${txn.transId}`);
      console.log(`Auth Code:        ${txn.authCode}`);
      console.log(`Response Code:    ${txn.responseCode} (1 = Approved)`);
      console.log(`Message:          ${txn.messages?.[0]?.description || 'Approved'}`);
      console.log(`AVS Result:       ${txn.avsResultCode || 'N/A'}`);
      console.log(`CVV Result:       ${txn.cvvResultCode || 'N/A'}`);
      console.log(`Amount:           $${testAmount}`);
      console.log('-'.repeat(70));

    } else {
      log.error('PAYMENT FAILED');
      
      console.log('\nError Details:');
      console.log('-'.repeat(70));
      
      if (result.transactionResponse) {
        const txn = result.transactionResponse;
        console.log(`Response Code:    ${txn.responseCode}`);
        console.log(`Error Code:       ${txn.errors?.[0]?.errorCode || 'N/A'}`);
        console.log(`Error Message:    ${txn.errors?.[0]?.errorText || 'Unknown error'}`);
      } else if (result.messages) {
        console.log(`Result Code:      ${result.messages.resultCode}`);
        console.log(`Message Code:     ${result.messages.message?.[0]?.code || 'N/A'}`);
        console.log(`Message:          ${result.messages.message?.[0]?.text || 'Unknown error'}`);
      }
      console.log('-'.repeat(70));
    }

    console.log('\nFull Response:');
    console.log(JSON.stringify(result, null, 2));

  } catch (error) {
    console.log('\n' + '='.repeat(70));
    log.error('REQUEST FAILED');
    console.log('='.repeat(70));

    if (error.response) {
      console.log(`\nHTTP Status:      ${error.response.status}`);
      console.log(`Response Data:    ${JSON.stringify(error.response.data, null, 2)}`);
    } else {
      console.log(`\nError:            ${error.message}`);
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('  TEST COMPLETE');
  console.log('='.repeat(70) + '\n');
}

testDirectPayment().catch(error => {
  log.error(`Fatal error: ${error.message}`);
  process.exit(1);
});
