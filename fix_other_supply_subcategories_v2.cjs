const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qiaetxkxweghuoxyhvml.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzbmhmZ2ZoaWRoenN3cWtocHp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3ODEzMDIsImV4cCI6MjA4NTM1NzMwMn0.cZs_jInY7UYWMay0VKGJVwpu9J8ApW_pCCY7yZF2utQ';

const supabase = createClient(supabaseUrl, supabaseKey);

(async () => {
  console.log('🔧 Adding missing subcategories to OTHER SUPPLY...\n');

  // First, check what IDs exist
  const { data: existing } = await supabase
    .from('subcategory_configs')
    .select('id, subcategory_name')
    .order('id', { ascending: false })
    .limit(5);

  console.log('Last 5 subcategory IDs:', existing?.map(e => `${e.id}: ${e.subcategory_name}`));

  // Get the max ID
  const maxId = Math.max(...(existing?.map(e => e.id) || [0]));
  console.log(`Max ID: ${maxId}\n`);

  const missingSubcategories = [
    {
      id: maxId + 1,
      category_name: 'OTHER SUPPLY',
      subcategory_name: 'THERMAL PAPER RECEIPT ROLLS'
    },
    {
      id: maxId + 2,
      category_name: 'OTHER SUPPLY',
      subcategory_name: 'RESIN ENHANCED WAX RIBBON'
    }
  ];

  for (const sub of missingSubcategories) {
    console.log(`Adding: ${sub.subcategory_name} with ID ${sub.id}...`);
    
    // Check if it already exists
    const { data: check } = await supabase
      .from('subcategory_configs')
      .select('id')
      .eq('subcategory_name', sub.subcategory_name)
      .eq('category_name', sub.category_name)
      .single();

    if (check) {
      console.log(`⚠️  ${sub.subcategory_name} already exists with ID ${check.id}`);
      continue;
    }

    const { data, error } = await supabase
      .from('subcategory_configs')
      .insert([sub])
      .select();

    if (error) {
      console.error(`❌ Error adding ${sub.subcategory_name}:`, error.message);
    } else {
      console.log(`✅ Successfully added ${sub.subcategory_name}`);
    }
  }

  console.log('\n🔍 Verifying all subcategories...');
  
  const { data: allSubs, error: verifyError } = await supabase
    .from('subcategory_configs')
    .select('*')
    .ilike('category_name', 'OTHER SUPPLY')
    .order('subcategory_name');

  if (verifyError) {
    console.error('❌ Error verifying:', verifyError);
  } else {
    console.log('\n📋 All OTHER SUPPLY subcategories:');
    allSubs?.forEach((s, i) => {
      console.log(`  ${i + 1}. ${s.subcategory_name} (ID: ${s.id})`);
    });
    console.log(`\nTotal: ${allSubs?.length || 0} subcategories`);
  }
})();
