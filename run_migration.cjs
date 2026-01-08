const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://wrvmbgmmuoivsfancgft.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indydm1iZ21tdW9pdnNmYW5jZ2Z0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwMzIzMTcsImV4cCI6MjA3ODYwODMxN30.qtTYnhBes4nd7n_kDH_S3HxS7Zl0pf1JW708wOJ7e08'
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
