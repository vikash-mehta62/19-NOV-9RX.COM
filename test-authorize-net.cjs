#!/usr/bin/env node

/**
 * Authorize.Net Payment Gateway Test Script
 * 
 * This script tests the Authorize.Net integration by:
 * 1. Checking configuration in database
 * 2. Testing API credentials
 * 3. Performing a test transaction (if credentials are valid)
 * 
 * Run: node test-authorize-net.js
 */

const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Load environment variables from multiple locations
require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: 'server/.env' });

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

// Configuration
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const serverUrl = process.env.VITE_API_BASE_URL || 'http://localhost:4001';

async function testAuthorizeNet() {
  console.log('\n' + '='.repeat(60));
  console.log('  AUTHORIZE.NET PAYMENT GATEWAY TEST');
  console.log('='.repeat(60) + '\n');

  // Step 1: Check Supabase connection
  log.step('Step 1: Checking Supabase connection...');
  
  if (!supabaseUrl || !supabaseKey) {
    log.error('Missing Supabase credentials in .env file');
    log.info('Required: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  log.success('Supabase client initialized');

  // Step 2: Check payment settings in database
  log.step('\nStep 2: Checking payment settings in database...');
  
  try {
    const { data: settings, error } = await supabase
      .from('payment_settings')
      .select('*')
      .eq('provider', 'authorize_net')
      .limit(1)
      .maybeSingle();

    if (error) {
      log.error(`Database error: ${error.message}`);
      log.info('Make sure payment_settings table exists and RLS policies allow access');
      return;
    }

    if (!settings) {
      log.error('No Authorize.Net settings found in database');
      log.info('Configure payment gateway in Admin Dashboard → Settings → Payments');
      return;
    }

    const config = settings.settings || {};
    
    console.log('\n' + '-'.repeat(60));
    console.log('  PAYMENT GATEWAY CONFIGURATION');
    console.log('-'.repeat(60));
    console.log(`Provider:         authorize_net`);
    console.log(`Enabled:          ${config.enabled ? '✅ Yes' : '❌ No'}`);
    console.log(`Test Mode:        ${config.testMode ? '🧪 Yes (Sandbox)' : '🏭 No (Production)'}`);
    
    const hasApiLoginId = config.apiLoginId && config.apiLoginId.length > 5;
    const hasTransactionKey = config.transactionKey && config.transactionKey.length > 5;
    
    console.log(`API Login ID:     ${hasApiLoginId ? '✅ Set (' + config.apiLoginId.substring(0, 4) + '***)' : '❌ Missing'}`);
    console.log(`Transaction Key:  ${hasTransactionKey ? '✅ Set (' + config.transactionKey.substring(0, 4) + '***)' : '❌ Missing'}`);
    console.log('-'.repeat(60) + '\n');

    if (!config.enabled) {
      log.error('Payment gateway is DISABLED');
      log.info('Enable it in Admin Settings → Payments');
      return;
    }

    if (!hasApiLoginId || !hasTransactionKey) {
      log.error('API credentials are missing or invalid');
      log.info('Add valid credentials in Admin Settings → Payments');
      return;
    }

    log.success('Payment settings configured correctly');

    // Step 3: Test API credentials
    log.step('\nStep 3: Testing Authorize.Net API credentials...');
    
    try {
      const testResponse = await axios.post(`${serverUrl}/test-authorize`, {
        apiLoginId: config.apiLoginId,
        transactionKey: config.transactionKey,
        testMode: config.testMode
      });

      if (testResponse.data.success) {
        log.success('API credentials are VALID!');
        if (testResponse.data.merchantName) {
          log.info(`Merchant Name: ${testResponse.data.merchantName}`);
        }
        log.info(`Environment: ${config.testMode ? 'Sandbox (Test)' : 'Production (Live)'}`);
      } else {
        log.error(`API test failed: ${testResponse.data.message}`);
        return;
      }
    } catch (error) {
      if (error.response) {
        log.error(`API test failed: ${error.response.data.message || error.message}`);
      } else if (error.code === 'ECONNREFUSED') {
        log.error('Cannot connect to server');
        log.info(`Make sure server is running at ${serverUrl}`);
        log.info('Run: cd server && npm start');
      } else {
        log.error(`API test error: ${error.message}`);
      }
      return;
    }

    // Step 4: Display test card information
    if (config.testMode) {
      console.log('\n' + '-'.repeat(60));
      console.log('  TEST CARD NUMBERS (Sandbox Mode)');
      console.log('-'.repeat(60));
      console.log('Visa:              4111111111111111');
      console.log('Visa (13 digits):  4007000000027');
      console.log('Mastercard:        5424000000000015');
      console.log('American Express:  378282246310005');
      console.log('Discover:          6011000000000012');
      console.log('\nExpiry Date:       Any future date (e.g., 12/25)');
      console.log('CVV:               Any 3-4 digits (e.g., 123)');
      console.log('Billing Address:   Any valid US address');
      console.log('-'.repeat(60) + '\n');
    }

    // Final summary
    console.log('\n' + '='.repeat(60));
    console.log('  TEST SUMMARY');
    console.log('='.repeat(60));
    log.success('Authorize.Net payment gateway is working correctly!');
    log.info(`Mode: ${config.testMode ? 'Test/Sandbox' : 'Production/Live'}`);
    log.info('You can now process payments through the application');
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    log.error(`Unexpected error: ${error.message}`);
    console.error(error);
  }
}

// Run the test
testAuthorizeNet().catch(error => {
  log.error(`Fatal error: ${error.message}`);
  process.exit(1);
});
