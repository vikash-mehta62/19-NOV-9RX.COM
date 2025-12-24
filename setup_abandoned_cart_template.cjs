const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://wrvmbgmmuoivsfancgft.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indydm1iZ21tdW9pdnNmYW5jZ2Z0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwMzIzMTcsImV4cCI6MjA3ODYwODMxN30.qtTYnhBes4nd7n_kDH_S3HxS7Zl0pf1JW708wOJ7e08";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const ABANDONED_CART_HTML = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #004d40; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
    .content { padding: 20px; border: 1px solid #ddd; border-top: none; border-radius: 0 0 5px 5px; }
    .button { display: inline-block; background-color: #004d40; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin-top: 20px; }
    .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
    .items-list { margin: 20px 0; border-top: 1px solid #eee; }
    .item { padding: 10px 0; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Don't Forget Your Items!</h1>
    </div>
    <div class="content">
      <p>Hi {{userName}},</p>
      <p>We noticed you left some great items in your cart. They're saved and ready for you!</p>
      
      <div class="items-list">
        <p><strong>Your Cart Total: $\{{cart_total}}</strong></p>
      </div>

      <p>Click the button below to complete your purchase before they run out of stock.</p>
      
      <center>
        <a href="{{cart_url}}" class="button" style="color: white;">Return to Cart</a>
      </center>
    </div>
    <div class="footer">
      <p>&copy; 2024 9RX Pharmacy. All rights reserved.</p>
      <p><a href="#">Unsubscribe</a></p>
    </div>
  </div>
</body>
</html>
`;

async function setup() {
    console.log("Setting up Abandoned Cart Template...");

    // 1. Sign In
    console.log("Signing in...");
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: "vikash@varnsolutions.com",
        password: "password"
    });

    let session = authData.session;
    if (!session) {
        console.log("Login with 'password' failed, trying '12345678'...");
        const { data: authData2, error: authError2 } = await supabase.auth.signInWithPassword({
            email: "vikash@varnsolutions.com",
            password: "12345678"
        });
        session = authData2.session;
    }

    if (!session) {
        console.error("Login failed. Cannot proceed.");
        return;
    }
    console.log("Logged in as:", session.user.email);

    // Create authenticated client
    const authClient = createClient(SUPABASE_URL, SUPABASE_KEY, {
        global: {
            headers: {
                Authorization: `Bearer ${session.access_token}`
            }
        }
    });

    // 2. Create Template
    const { data: template, error: tmplError } = await authClient
        .from("email_templates")
        .insert({
            name: "Abandoned Cart Recovery",
            subject: "You left something behind in your cart!",
            template_type: "abandoned_cart",
            html_content: ABANDONED_CART_HTML,
            is_active: true
        })
        .select()
        .single();

    if (tmplError) {
        console.error("Error creating template:", tmplError.message);
    } else {
        console.log("Template created:", template.id);

        // 3. Update Automation to use this template
        const { error: updateError } = await authClient
            .from("email_automations")
            .update({ template_id: template.id })
            .eq("trigger_type", "abandoned_cart");
        
        if (updateError) {
            console.error("Error updating automation:", updateError.message);
        } else {
            console.log("Automation updated to use new template.");
        }
    }
}

setup();
