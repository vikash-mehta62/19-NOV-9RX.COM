#!/usr/bin/env node

/**
 * Payment Configuration Diagnostic Tool
 * 
 * This script checks if payment gateway is properly configured
 * Run: node test_payment_config.cjs
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  console.error('   Required: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPaymentConfig() {
  console.log('🔍 Checking Payment Gateway Configuration...\n');

  try {
    // Check if payment_settings table exists
    const { data: settings, error } = await supabase
      .from('payment_settings')
      .select('*')
      .eq('provider', 'authorize_net')
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('❌ Error querying payment_settings:', error.message);
      console.error('   This might mean:');
      console.error('   1. The table does not exist (run migrations)');
      console.error('   2. RLS policies are blocking access');
      console.error('   3. You are not authenticated\n');
      return;
    }

    if (!settings) {
      console.error('❌ No Authorize.Net payment settings found');
      console.error('   Action Required:');
      console.error('   1. Log in as admin');
      console.error('   2. Go to Admin Dashboard → Settings → Payments');
      console.error('   3. Enable Authorize.Net and add credentials');
      console.error('   4. Or run FIX_PAYMENT_GATEWAY.sql with your credentials\n');
      return;
    }

    console.log('✅ Payment settings found\n');
    console.log('Configuration Details:');
    console.log('─────────────────────────────────────');
    
    const config = settings.settings || {};
    
    console.log(`Provider:         authorize_net`);
    console.log(`Enabled:          ${config.enabled ? '✅ Yes' : '❌ No'}`);
    console.log(`Test Mode:        ${config.testMode ? '🧪 Yes (Sandbox)' : '🏭 No (Production)'}`);
    
    // Check API Login ID
    const hasApiLoginId = config.apiLoginId && config.apiLoginId.length > 5;
    console.log(`API Login ID:     ${hasApiLoginId ? '✅ Set (' + config.apiLoginId.substring(0, 3) + '***)' : '❌ Missing or Invalid'}`);
    
    // Check Transaction Key
    const hasTransactionKey = config.transactionKey && config.transactionKey.length > 5;
    console.log(`Transaction Key:  ${hasTransactionKey ? '✅ Set (' + config.transactionKey.substring(0, 3) + '***)' : '❌ Missing or Invalid'}`);
    
    console.log('─────────────────────────────────────\n');

    // Validation
    let hasErrors = false;
    
    if (!config.enabled) {
      console.error('⚠️  Payment gateway is DISABLED');
      console.error('   Enable it in Admin Settings → Payments\n');
      hasErrors = true;
    }
    
    if (!hasApiLoginId) {
      console.error('❌ API Login ID is missing or too short (must be > 5 chars)');
      hasErrors = true;
    }
    
    if (!hasTransactionKey) {
      console.error('❌ Transaction Key is missing or too short (must be > 5 chars)');
      hasErrors = true;
    }

    if (hasErrors) {
      console.error('\n🚨 Payment gateway is NOT properly configured');
      console.error('   Payments will fail until these issues are fixed\n');
    } else {
      console.log('✅ Payment gateway is properly configured!');
      console.log(`   Mode: ${config.testMode ? 'Test/Sandbox' : 'Production'}`);
      console.log('   Ready to process payments\n');
      
      if (config.testMode) {
        console.log('💡 Test Card Numbers:');
        console.log('   Visa:       4111111111111111');
        console.log('   Mastercard: 5424000000000015');
        console.log('   Amex:       378282246310005');
        console.log('   Expiry:     Any future date (MMYY)');
        console.log('   CVV:        Any 3-4 digits\n');
      }
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

checkPaymentConfig();
