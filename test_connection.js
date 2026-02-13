import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://asnhfgfhidhzswqkhpzz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzbmhmZ2ZoaWRoenN3cWtocHp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3ODEzMDIsImV4cCI6MjA4NTM1NzMwMn0.cZs_jInY7UYWMay0VKGJVwpu9J8ApW_pCCY7yZF2utQ';

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
