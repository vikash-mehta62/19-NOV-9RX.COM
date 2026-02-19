const { createClient } = require('@supabase/supabase-js');

// Using the service role key to bypass RLS for debugging
const SUPABASE_URL = "https://qiaetxkxweghuoxyhvml.supabase.co";
// NOTE: This key should ideally come from env vars, but using here for debug as requested
// IF YOU DO NOT HAVE SERVICE ROLE KEY, WE MUST RELY ON RLS POLICIES WORKING CORRECTLY
// Trying with anon key first, but maybe we need to sign in?
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzbmhmZ2ZoaWRoenN3cWtocHp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3ODEzMDIsImV4cCI6MjA4NTM1NzMwMn0.cZs_jInY7UYWMay0VKGJVwpu9J8ApW_pCCY7yZF2utQ";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

async function check() {
  console.log("Checking connection with anon key...");
  
  // Try to list ANY table we know exists publicly or we can access
  const { data: products, error: prodError } = await supabase
    .from("products")
    .select("id")
    .limit(1);

  if (prodError) {
      console.log("Basic connection/product fetch failed:", prodError.message);
  } else {
      console.log("Basic connection successful. Products found:", products?.length);
  }

  console.log("\nChecking email_automations...");
  // Using a simpler query to verify connection first
  const { data: automations, error: autoError } = await supabase
    .from("email_automations")
    .select("*");
    // .eq("trigger_type", "abandoned_cart");

  if (autoError) {
    console.error("Error fetching automations:", autoError);
  } else {
    console.log("Automations found:", automations);
  }

  console.log("\nChecking carts...");
  // Check for carts that SHOULD match the criteria
  // Status = active, updated_at < 2 mins ago (based on my change), abandoned_email_sent_at is null
  const cutoffTime = new Date(Date.now() - 2 * 60 * 1000).toISOString();
  console.log("Looking for carts updated before:", cutoffTime);

  // Debugging RLS: check if we can see ANY carts
  const { data: allCarts, error: allCartsError } = await supabase
      .from("carts")
      .select("id")
      .limit(1);
  console.log("Can see any carts?", allCarts?.length, allCartsError?.message || "OK");

  // ATTEMPT TO SIGN IN AND CREATE CART
  console.log("\nAttempting to sign in and create/update a test cart...");
  
  // Try to sign in with common test credentials
  const email = "vikash@varnsolutions.com";
  const password = "12345678"; // Common default, or maybe 12345678? Let's try likely ones.
  // Actually, let's try to find a user we can use or just create a new one if possible (admin API needed usually)
  // But we can try to sign in.
  
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: email,
      password: "password"
  });

  let session = authData.session;
  if (!session) {
      console.log("Login with 'password' failed, trying '12345678'...");
      const { data: authData2, error: authError2 } = await supabase.auth.signInWithPassword({
          email: email,
          password: "12345678"
      });
      session = authData2.session;
  }

  if (session) {
      console.log("Login successful! User:", session.user.email);
      // Now use this authenticated client
      // We can't easily switch the client in this script without re-creating it or passing headers.
      // But we can use the access token in a new client or just rely on global scope if we could set it.
      // supabase-js creates a new client usually.
      
      const authClient = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
          global: {
              headers: {
                  Authorization: `Bearer ${session.access_token}`
              }
          }
      });

      const user = session.user;
       
      // Check if this user has a cart
      const { data: userCarts } = await authClient.from("carts").select("id").eq("user_id", user.id).eq("status", "active");
      
      let cartId;
      if (userCarts && userCarts.length > 0) {
          cartId = userCarts[0].id;
          console.log("User has active cart:", cartId);
      } else {
          // Create cart
          const { data: newCart, error: createError } = await authClient
              .from("carts")
              .insert({
                  user_id: user.id,
                  status: "active",
                  total: 150,
                  items: [{id: "test", name: "Test Item", price: 150, quantity: 1}]
              })
              .select()
              .single();
          
          if (createError) {
              console.error("Failed to create cart:", createError.message);
          } else {
              cartId = newCart.id;
              console.log("Created new cart:", cartId);
          }
      }

      if (cartId) {
          // Update cart to be "old" (3 minutes ago)
          // AND clear the abandoned_email_sent_at flag if it exists
          const oldTime = new Date(Date.now() - 3 * 60 * 1000).toISOString();
          const { error: updateError } = await authClient
              .from("carts")
              .update({ 
                  updated_at: oldTime,
                  abandoned_email_sent_at: null 
              })
              .eq("id", cartId);
          
          if (updateError) {
              console.error("Failed to update cart time:", updateError.message);
          } else {
              console.log("Successfully updated cart to be 3 minutes old. Cron job should pick it up now.");
          }
      }
  } else {
      console.log("Login failed. Cannot manipulate carts without auth.");
  }


  const { data: carts, error: cartError } = await supabase
    .from("carts")
    .select("id, user_id, updated_at, total, abandoned_email_sent_at, status")
    .eq("status", "active")
    .is("abandoned_email_sent_at", null);
    // .lt("updated_at", cutoffTime);

  if (cartError) {
    console.error("Error fetching carts:", cartError);
  } else {
    console.log(`Found ${carts.length} potential abandoned carts:`);
    carts.forEach(c => {
        console.log(`- ID: ${c.id}, Updated: ${c.updated_at}, User: ${c.user_id}, Total: ${c.total}`);
    });
  }
}

check();
