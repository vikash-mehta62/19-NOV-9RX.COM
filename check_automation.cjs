const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: "./server/.env" });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAutomation() {
    // Sign in first
    await supabase.auth.signInWithPassword({
        email: "vikash@varnsolutions.com",
        password: "password"
    });

    const { data, error } = await supabase
        .from("email_automations")
        .select("*")
        .eq("trigger_type", "abandoned_cart");

    if (error) {
        console.error("Error:", error);
    } else {
        console.log("Automations found:", data);
    }
}

checkAutomation();
