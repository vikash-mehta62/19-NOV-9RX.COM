const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://wrvmbgmmuoivsfancgft.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indydm1iZ21tdW9pdnNmYW5jZ2Z0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwMzIzMTcsImV4cCI6MjA3ODYwODMxN30.qtTYnhBes4nd7n_kDH_S3HxS7Zl0pf1JW708wOJ7e08";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function runCron() {
    console.log("Starting manual cron trigger...");

    // 1. Sign In
    console.log("Signing in...");
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: "vikash@varnsolutions.com",
        password: "12345678"
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

    // 2. Get Abandoned Cart Automation settings
    const { data: automations } = await authClient
        .from("email_automations")
        .select("*")
        .eq("trigger_type", "abandoned_cart")
        .eq("is_active", true);

    if (!automations || automations.length === 0) {
        console.log("No active abandoned cart automations found.");
        // Create one if missing? No, user wants simple check.
        return;
    }
    const automation = automations[0];
    console.log("Found automation:", automation.name);

    // 3. Find abandoned carts (cutoff 0 mins ago for testing)
    const emailCutoffTime = new Date().toISOString();
    console.log("Looking for carts updated before:", emailCutoffTime);

    // DEBUG: Reset all active carts for this user to ensure we can test
    console.log("Resetting abandoned_email_sent_at for testing...");
    await authClient
        .from("carts")
        .update({ abandoned_email_sent_at: null })
        .eq("user_id", session.user.id)
        .eq("status", "active");

    // DEBUG: List all carts for this user to see what's wrong
    const { data: allUserCarts } = await authClient
        .from("carts")
        .select("id, updated_at, status, abandoned_email_sent_at")
        .eq("status", "active");
    console.log("DEBUG: All active carts for user:", allUserCarts);

    const { data: abandonedCarts, error: cartError } = await authClient
        .from("carts")
        .select(`
            id,
            user_id,
            total,
            items,
            updated_at,
            abandoned_email_sent_at
        `)
        .eq("status", "active")
        .lt("updated_at", emailCutoffTime)
        .is("abandoned_email_sent_at", null)
        .limit(5);

    if (cartError) {
        console.error("Error fetching carts:", cartError);
        return;
    }

    if (!abandonedCarts || abandonedCarts.length === 0) {
        console.log("No abandoned carts found.");
        return;
    }

    console.log(`Found ${abandonedCarts.length} abandoned carts.`);

    for (const cart of abandonedCarts) {
        console.log(`Processing cart ${cart.id} (User: ${cart.user_id})...`);

        // Fetch user email
        const { data: userProfile, error: userError } = await authClient
            .from("profiles")
            .select("email, first_name, last_name")
            .eq("id", cart.user_id)
            .single();
        
        if (userError || !userProfile) {
            console.error(`Could not fetch user profile for ${cart.user_id}:`, userError?.message);
            // Fallback: try to use session user email if cart belongs to session user
            if (cart.user_id === session.user.id) {
                userProfile = { email: session.user.email };
            } else {
                continue;
            }
        }

        const email = userProfile.email;
        console.log(`Sending email to: ${email}`);

        // 4. Queue Email
        const { data: queueData, error: queueError } = await authClient
            .from("email_queue")
            .insert({
                email: email,
                subject: "You left something behind! (Manual Trigger)",
                html_content: `<p>Hi ${userProfile.first_name || 'Customer'},</p><p>You have items in your cart.</p>`,
                automation_id: automation.id,
                metadata: {
                    cart_id: cart.id,
                    user_id: cart.user_id,
                    trigger_type: "abandoned_cart"
                },
                status: "pending",
                priority: 1
            })
            .select()
            .single();

        if (queueError) {
            console.error("Failed to queue email:", queueError.message);
        } else {
            console.log("Email queued successfully! ID:", queueData.id);

            // 5. Update Cart
            const { error: updateError } = await authClient
                .from("carts")
                .update({ abandoned_email_sent_at: new Date().toISOString() })
                .eq("id", cart.id);
            
            if (updateError) {
                console.error("Failed to update cart status:", updateError.message);
            } else {
                console.log("Cart updated as sent.");
            }
        }
    }
}

runCron();
