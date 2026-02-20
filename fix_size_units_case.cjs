const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qiaetxkxweghuoxyhvml.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzbmhmZ2ZoaWRoenN3cWtocHp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3ODEzMDIsImV4cCI6MjA4NTM1NzMwMn0.cZs_jInY7UYWMay0VKGJVwpu9J8ApW_pCCY7yZF2utQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAndFixSizeUnits() {
  console.log('🔍 Checking size_unit values in product_sizes table...\n');
  
  try {
    // Fetch all product sizes with their size_unit values
    const { data: sizes, error } = await supabase
      .from('product_sizes')
      .select('id, size_value, size_unit, sku')
      .order('size_unit');

    if (error) {
      console.error('Error fetching sizes:', error.message);
      return;
    }

    console.log(`📦 Found ${sizes.length} product sizes\n`);

    // Group by size_unit to see all unique values
    const unitGroups = {};
    sizes.forEach(size => {
      const unit = size.size_unit || '(empty)';
      if (!unitGroups[unit]) {
        unitGroups[unit] = [];
      }
      unitGroups[unit].push(size);
    });

    console.log('📊 Size Units Summary:');
    console.log('=' .repeat(60));
    
    Object.keys(unitGroups).sort().forEach(unit => {
      const count = unitGroups[unit].length;
      const isLowercase = unit !== unit.toUpperCase() && unit !== '(empty)';
      const marker = isLowercase ? '⚠️  LOWERCASE' : '✅';
      console.log(`${marker} "${unit}" - ${count} items`);
    });

    // Find lowercase units that need fixing
    const lowercaseUnits = Object.keys(unitGroups).filter(unit => 
      unit !== '(empty)' && unit !== unit.toUpperCase()
    );

    if (lowercaseUnits.length === 0) {
      console.log('\n✅ All size units are already uppercase!');
      return;
    }

    console.log('\n⚠️  Found lowercase size units that need fixing:');
    lowercaseUnits.forEach(unit => {
      console.log(`   "${unit}" → "${unit.toUpperCase()}" (${unitGroups[unit].length} items)`);
    });

    // Ask for confirmation before fixing
    console.log('\n🔧 Fixing lowercase size units...\n');

    for (const unit of lowercaseUnits) {
      const uppercaseUnit = unit.toUpperCase();
      const idsToUpdate = unitGroups[unit].map(s => s.id);
      
      console.log(`   Updating "${unit}" → "${uppercaseUnit}" for ${idsToUpdate.length} items...`);
      
      const { error: updateError } = await supabase
        .from('product_sizes')
        .update({ size_unit: uppercaseUnit })
        .in('id', idsToUpdate);

      if (updateError) {
        console.error(`   ❌ Error updating: ${updateError.message}`);
      } else {
        console.log(`   ✅ Updated ${idsToUpdate.length} items`);
      }
    }

    console.log('\n✅ Done! All size units are now uppercase.');

  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

checkAndFixSizeUnits();
