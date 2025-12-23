import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wrvmbgmmuoivsfancgft.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indydm1iZ21tdW9pdnNmYW5jZ2Z0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwMzIzMTcsImV4cCI6MjA3ODYwODMxN30.qtTYnhBes4nd7n_kDH_S3HxS7Zl0pf1JW708wOJ7e08';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  try {
    const { count, error } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.log('Connection Failed:', error.message);
    } else {
      console.log('Connection Successful!');
      console.log('Access to "profiles" table confirmed.');
    }
  } catch (err) {
    console.log('Exception:', err.message);
  }
}

testConnection();
