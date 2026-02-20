const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qiaetxkxweghuoxyhvml.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzbmhmZ2ZoaWRoenN3cWtocHp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3ODEzMDIsImV4cCI6MjA4NTM1NzMwMn0.cZs_jInY7UYWMay0VKGJVwpu9J8ApW_pCCY7yZF2utQ';

const supabase = createClient(supabaseUrl, supabaseKey);

(async () => {
  console.log('🔍 Checking OTHER SUPPLY subcategories...\n');

  // Get all subcategories for OTHER SUPPLY
  const { data: subcategories, error: subError } = await supabase
    .from('subcategory_configs')
    .select('*')
    .ilike('category_name', 'OTHER SUPPLY')
    .order('subcategory_name');

  if (subError) {
    console.error('❌ Error fetching subcategories:', subError);
    return;
  }

  console.log('📋 Subcategories in database for OTHER SUPPLY:');
  console.log(JSON.stringify(subcategories, null, 2));
  console.log(`\nTotal: ${subcategories?.length || 0} subcategories\n`);

  // Get all products in OTHER SUPPLY category
  const { data: products, error: prodError } = await supabase
    .from('products')
    .select('id, name, category, subcategory')
    .ilike('category', 'OTHER SUPPLY');

  if (prodError) {
    console.error('❌ Error fetching products:', prodError);
    return;
  }

  console.log('📦 Products in OTHER SUPPLY category:');
  products?.forEach(p => {
    console.log(`  - ${p.name}`);
    console.log(`    Category: ${p.category}`);
    console.log(`    Subcategory: ${p.subcategory || 'NULL'}`);
  });
  console.log(`\nTotal: ${products?.length || 0} products\n`);

  // Check for mismatches
  const productSubcategories = [...new Set(products?.map(p => p.subcategory).filter(Boolean))];
  const configSubcategories = subcategories?.map(s => s.subcategory_name) || [];

  console.log('🔍 Analysis:');
  console.log('Product subcategories:', productSubcategories);
  console.log('Config subcategories:', configSubcategories);

  const missing = productSubcategories.filter(ps => 
    !configSubcategories.some(cs => cs.toLowerCase() === ps.toLowerCase())
  );

  if (missing.length > 0) {
    console.log('\n⚠️  Missing subcategories in config:');
    missing.forEach(m => console.log(`  - ${m}`));
  } else {
    console.log('\n✅ All product subcategories exist in config');
  }
})();
