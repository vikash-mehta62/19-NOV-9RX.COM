const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qiaetxkxweghuoxyhvml.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzbmhmZ2ZoaWRoenN3cWtocHp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3ODEzMDIsImV4cCI6MjA4NTM1NzMwMn0.cZs_jInY7UYWMay0VKGJVwpu9J8ApW_pCCY7yZF2utQ';

const supabase = createClient(supabaseUrl, supabaseKey);

(async () => {
  console.log('🔧 Adding missing subcategories to OTHER SUPPLY...\n');

  const missingSubcategories = [
    {
      category_name: 'OTHER SUPPLY',
      subcategory_name: 'THERMAL PAPER RECEIPT ROLLS'
    },
    {
      category_name: 'OTHER SUPPLY',
      subcategory_name: 'RESIN ENHANCED WAX RIBBON'
    }
  ];

  for (const sub of missingSubcategories) {
    console.log(`Adding: ${sub.subcategory_name}...`);
    
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
      console.log(`  ${i + 1}. ${s.subcategory_name}`);
    });
    console.log(`\nTotal: ${allSubs?.length || 0} subcategories`);
  }
})();
