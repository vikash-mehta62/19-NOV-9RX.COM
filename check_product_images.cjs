const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://asnhfgfhidhzswqkhpzz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzbmhmZ2ZoaWRoenN3cWtocHp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3ODEzMDIsImV4cCI6MjA4NTM1NzMwMn0.cZs_jInY7UYWMay0VKGJVwpu9J8ApW_pCCY7yZF2utQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkProductImages() {
  console.log('🔍 Checking product images in database...\n');
  
  try {
    // Fetch all products with their sizes
    const { data: products, error } = await supabase
      .from('products')
      .select('id, name, sku, category, images, image_url, product_sizes(id, size_value, size_unit, image, sku)')
      .order('name');

    if (error) {
      console.error('Error fetching products:', error.message);
      return;
    }

    console.log(`📦 Found ${products.length} products\n`);
    console.log('=' .repeat(80));

    // Filter products that might have the "roll attached" issue
    // Looking for products with "thermal" or "roll" in name
    const thermalProducts = products.filter(p => 
      p.name?.toLowerCase().includes('thermal') || 
      p.name?.toLowerCase().includes('roll') ||
      p.category?.toLowerCase().includes('thermal') ||
      p.category?.toLowerCase().includes('label')
    );

    console.log(`\n🎯 Found ${thermalProducts.length} thermal/roll related products:\n`);

    thermalProducts.forEach((product, index) => {
      console.log(`\n${index + 1}. ${product.name}`);
      console.log(`   SKU: ${product.sku || 'N/A'}`);
      console.log(`   Category: ${product.category || 'N/A'}`);
      console.log(`   Main Images: ${product.images?.length || 0} image(s)`);
      
      if (product.images && product.images.length > 0) {
        product.images.forEach((img, i) => {
          const imageUrl = img.startsWith('http') 
            ? img 
            : `https://cfyqeilfmodrbiamqgme.supabase.co/storage/v1/object/public/product-images/${img}`;
          console.log(`      [${i + 1}] ${imageUrl}`);
        });
      }

      if (product.product_sizes && product.product_sizes.length > 0) {
        console.log(`   Sizes: ${product.product_sizes.length}`);
        product.product_sizes.forEach(size => {
          const sizeLabel = `${size.size_value}${size.size_unit || ''}`;
          const hasImage = size.image ? '✅ Has image' : '❌ No image';
          console.log(`      - ${sizeLabel} (SKU: ${size.sku || 'N/A'}) ${hasImage}`);
          if (size.image) {
            const sizeImageUrl = size.image.startsWith('http')
              ? size.image
              : `https://cfyqeilfmodrbiamqgme.supabase.co/storage/v1/object/public/product-images/${size.image}`;
            console.log(`        Image: ${sizeImageUrl}`);
          }
        });
      }
    });

    // Summary
    console.log('\n' + '=' .repeat(80));
    console.log('\n📊 SUMMARY:');
    console.log(`   Total products: ${products.length}`);
    console.log(`   Thermal/Roll products: ${thermalProducts.length}`);
    
    const productsWithMultipleImages = thermalProducts.filter(p => p.images?.length > 1);
    console.log(`   Products with multiple images: ${productsWithMultipleImages.length}`);
    
    const sizesWithImages = thermalProducts.reduce((count, p) => {
      return count + (p.product_sizes?.filter(s => s.image)?.length || 0);
    }, 0);
    console.log(`   Sizes with dedicated images: ${sizesWithImages}`);

    console.log('\n💡 RECOMMENDATION:');
    console.log('   Review the image URLs above and check if any product images');
    console.log('   contain both the main product AND a small roll in the same photo.');
    console.log('   If so, you should re-upload clean images for those products.');

  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

checkProductImages();
