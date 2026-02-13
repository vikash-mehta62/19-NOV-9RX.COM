const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://asnhfgfhidhzswqkhpzz.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzbmhmZ2ZoaWRoenN3cWtocHp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3ODEzMDIsImV4cCI6MjA4NTM1NzMwMn0.cZs_jInY7UYWMay0VKGJVwpu9J8ApW_pCCY7yZF2utQ'
);

async function runMigration() {
  console.log('🚀 Running migration to add similar_products column...');

  try {
    // First, check if column already exists
    const { data: products, error: selectError } = await supabase
      .from('products')
      .select('similar_products')
      .limit(1);

    if (!selectError) {
      console.log('✅ Column already exists!');
      return;
    }

    console.log('Column does not exist yet. You need to run this SQL in Supabase Dashboard:');
    console.log('\n--- Copy this SQL ---');
    console.log(`
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS similar_products JSONB DEFAULT '[]';

COMMENT ON COLUMN products.similar_products IS 'Array of subcategory objects for similar product recommendations (max 2) - format: [{ id, category_name, subcategory_name }]';
    `);
    console.log('--- End SQL ---\n');
    console.log('📋 Steps:');
    console.log('1. Go to: https://wrvmbgmmuoivsfancgft.supabase.co/project/_/sql/new');
    console.log('2. Paste the SQL above');
    console.log('3. Click "Run" (or press Ctrl+Enter)');
    console.log('4. Come back and test your form!');

  } catch (error) {
    console.error('Error:', error.message);
  }
}

runMigration();
