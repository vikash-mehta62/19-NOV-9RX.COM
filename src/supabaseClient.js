import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://asnhfgfhidhzswqkhpzz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzbmhmZ2ZoaWRoenN3cWtocHp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3ODEzMDIsImV4cCI6MjA4NTM1NzMwMn0.cZs_jInY7UYWMay0VKGJVwpu9J8ApW_pCCY7yZF2utQ';

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    storage: localStorage,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  headers: {
    'apikey': supabaseKey
  }
});

// Extended fields based on the comprehensive form schema
const expectedFields = [
  // Basic Information
  'id',
  'first_name',
  'last_name',
  'email',
  'type',
  'status',
  'role',

  // Contact Information
  'alternative_email',
  'website',
  'work_phone',
  'mobile_phone',
  'fax_number',
  'contact_person',
  'department',

  // Business Information
  'company_name',
  'display_name',
  'pharmacy_license',
  'group_station',
  'tax_id',

  // Additional Fields
  'notes',
  'preferred_contact_method',
  'language_preference',

  // Documents and References
  'documents',

  // Address Information
  'billing_address',
  'shipping_address',
  'same_as_shipping',
  'freeShipping',
  'order-pay',

  // Financial Information
  'tax_preference',
  'currency',
  'payment_terms',
  'credit_limit',
  'payment_method',

  // Portal Settings
  'enable_portal',
  'portal_language',

  // System Fields
  'created_at',
  'updated_at',
  'last_login',
  'account_status'
];

// Test the connection and verify table structure
const testConnection = async () => {
  try {
    console.log('Starting Supabase connection test...');

    // Test basic connection
    const { data: profileCount, error: countError } = await supabase
      .from('profiles')
      .select('count', { count: 'exact' });

    if (countError) {
      console.error('❌ Supabase connection error:', countError.message);
      return false;
    }

    console.log('✅ Connected to Supabase successfully');
    console.log(`📊 Total profiles in database: ${profileCount?.count || 0}`);

    // Check table structure
    const { data: tableInfo, error: tableError } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);

    if (tableError) {
      console.error('❌ Error fetching table structure:', tableError.message);
      return false;
    }

    // Log table structure for verification
    if (tableInfo && tableInfo[0]) {
      const existingFields = Object.keys(tableInfo[0]);
      console.log('\n📋 Table Structure Analysis:');
      console.log('Available fields:', existingFields);

      // Check for missing fields
      const missingFields = expectedFields.filter(field => !existingFields.includes(field));

      if (missingFields.length > 0) {
        console.error('\n❌ Missing fields in profiles table:');
        missingFields.forEach(field => {
          console.error(`  - ${field}`);
        });

        // Generate SQL commands for missing fields
        console.log('\n💡 SQL commands to add missing fields:');
        missingFields.forEach(field => {
          let sqlType = 'text';

          // Determine appropriate SQL type based on field name
          if (field.includes('_at')) {
            sqlType = 'timestamp with time zone';
          } else if (field === 'credit_limit') {
            sqlType = 'numeric(10,2)';
          } else if (field === 'same_as_shipping' || field === 'enable_portal') {
            sqlType = 'boolean DEFAULT false';
          } else if (field === 'freeShipping' || field === 'enable_portal') {
            sqlType = 'boolean DEFAULT false';
          } else if (field === 'documents') {
          } else if (field === 'order_pay' || field === 'enable_portal') {
            sqlType = 'boolean DEFAULT false';
          } else if (field === 'documents') {
            sqlType = 'jsonb[]';
          } else if (field.includes('address')) {
            sqlType = 'jsonb';
          }

          console.log(`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ${field} ${sqlType};`);
        });

        // Generate indexes for commonly queried fields
        console.log('\n💡 Recommended indexes:');
        console.log('CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);');
        console.log('CREATE INDEX IF NOT EXISTS idx_profiles_status ON profiles(status);');
        console.log('CREATE INDEX IF NOT EXISTS idx_profiles_type ON profiles(type);');
        console.log('CREATE INDEX IF NOT EXISTS idx_profiles_company ON profiles(company_name);');
      } else {
        console.log('\n✅ All expected fields are present in the profiles table');
      }
    }

    return true;
  } catch (err) {
    console.error('❌ Failed to connect to Supabase:', err);
    return false;
  }
};

// Run the test immediately
testConnection();

export default supabase;