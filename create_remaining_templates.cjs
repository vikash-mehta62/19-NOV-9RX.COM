const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './server/.env' });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Using allowed template_type values
const templates = {
  welcome: {
    name: 'Welcome Email - Auto',
    subject: 'Welcome to 9RX, {{first_name}}! 🎉',
    template_type: 'welcome',
    html_content: `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;"><div style="background:linear-gradient(135deg,#10b981,#059669);padding:30px;text-align:center;border-radius:10px 10px 0 0;"><h1 style="color:white;margin:0;">Welcome to 9RX! 🎉</h1></div><div style="background:#f9fafb;padding:30px;border-radius:0 0 10px 10px;"><p style="font-size:16px;">Hi {{first_name}},</p><p>Thank you for joining 9RX - your trusted partner for quality medical supplies!</p><div style="background:#ecfdf5;padding:20px;border-radius:8px;margin:20px 0;"><h3 style="color:#065f46;margin:0 0 15px;">What's Next?</h3><ul style="margin:0;padding:0 0 0 20px;color:#047857;"><li>Browse our extensive catalog</li><li>Enjoy wholesale pricing</li><li>Earn reward points on every purchase</li></ul></div><div style="text-align:center;margin:30px 0;"><a href="https://9rx.com/pharmacy" style="background:#10b981;color:white;padding:15px 30px;text-decoration:none;border-radius:5px;font-weight:bold;">Start Shopping →</a></div></div></body></html>`,
    variables: ['first_name']
  },
  order_shipped: {
    name: 'Shipping Notification - Auto',
    subject: 'Your Order is On Its Way! 🚚 #{{order_number}}',
    template_type: 'order_confirmation', // Using allowed type
    html_content: `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;"><div style="background:linear-gradient(135deg,#8b5cf6,#6d28d9);padding:30px;text-align:center;border-radius:10px 10px 0 0;"><h1 style="color:white;margin:0;">Your Order Has Shipped! 🚚</h1></div><div style="background:#f9fafb;padding:30px;border-radius:0 0 10px 10px;"><p style="font-size:16px;">Hi {{first_name}},</p><p>Exciting news! Your order #{{order_number}} is on its way.</p><div style="background:#f5f3ff;padding:20px;border-radius:8px;margin:20px 0;text-align:center;"><p style="color:#6d28d9;font-weight:bold;margin:0 0 10px;">Tracking Number</p><p style="font-size:20px;font-family:monospace;margin:0;">{{tracking_number}}</p></div><div style="text-align:center;margin:30px 0;"><a href="{{tracking_url}}" style="background:#8b5cf6;color:white;padding:15px 30px;text-decoration:none;border-radius:5px;font-weight:bold;">Track Your Package</a></div></div></body></html>`,
    variables: ['first_name', 'order_number', 'tracking_number', 'tracking_url']
  },
  order_delivered: {
    name: 'Delivery & Feedback - Auto',
    subject: 'Your Order Has Been Delivered! 📬 How Did We Do?',
    template_type: 'order_confirmation', // Using allowed type
    html_content: `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;"><div style="background:linear-gradient(135deg,#10b981,#059669);padding:30px;text-align:center;border-radius:10px 10px 0 0;"><h1 style="color:white;margin:0;">Order Delivered! 📬</h1></div><div style="background:#f9fafb;padding:30px;border-radius:0 0 10px 10px;"><p style="font-size:16px;">Hi {{first_name}},</p><p>Your order #{{order_number}} has been delivered!</p><div style="background:#fef3c7;padding:20px;border-radius:8px;margin:20px 0;text-align:center;"><h3 style="color:#92400e;margin:0 0 10px;">⭐ Leave a Review & Earn 50 Points!</h3><p style="color:#78350f;margin:0;">Share your experience and help other customers.</p></div><div style="text-align:center;margin:30px 0;"><a href="https://9rx.com/pharmacy/orders" style="background:#f59e0b;color:white;padding:15px 30px;text-decoration:none;border-radius:5px;font-weight:bold;">Write a Review</a></div></div></body></html>`,
    variables: ['first_name', 'order_number']
  },
  inactive_user: {
    name: 'Win-Back Campaign - Auto',
    subject: 'We Miss You, {{first_name}}! Come Back for 10% Off 🎁',
    template_type: 'promotional', // Using allowed type
    html_content: `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;"><div style="background:linear-gradient(135deg,#ec4899,#be185d);padding:30px;text-align:center;border-radius:10px 10px 0 0;"><h1 style="color:white;margin:0;">We Miss You! 💕</h1></div><div style="background:#f9fafb;padding:30px;border-radius:0 0 10px 10px;"><p style="font-size:16px;">Hi {{first_name}},</p><p>It's been a while since we've seen you at 9RX.</p><div style="background:#fdf2f8;padding:20px;border-radius:8px;margin:20px 0;text-align:center;"><h3 style="color:#be185d;margin:0 0 10px;">🎁 Special Offer Just For You!</h3><p style="font-size:36px;font-weight:bold;color:#ec4899;margin:0;">10% OFF</p><p style="color:#9d174d;margin:10px 0 0;">Use code: <strong>COMEBACK10</strong></p></div><div style="text-align:center;margin:30px 0;"><a href="https://9rx.com/pharmacy" style="background:#ec4899;color:white;padding:15px 30px;text-decoration:none;border-radius:5px;font-weight:bold;">Shop Now</a></div></div></body></html>`,
    variables: ['first_name']
  }
};

async function createTemplates() {
  console.log('\n🔧 Creating Remaining Email Templates\n');
  console.log('='.repeat(60));
  
  // Get automations without templates
  const { data: automations } = await supabase
    .from('email_automations')
    .select('id, name, trigger_type, template_id')
    .is('template_id', null);
  
  console.log('Automations without templates:', automations?.length || 0);
  
  for (const auto of automations || []) {
    const tpl = templates[auto.trigger_type];
    if (!tpl) {
      console.log('⏭️', auto.name, '- no template defined');
      continue;
    }
    
    // Create template
    const { data: newTpl, error: tplErr } = await supabase
      .from('email_templates')
      .insert({
        name: tpl.name,
        subject: tpl.subject,
        template_type: tpl.template_type,
        html_content: tpl.html_content,
        variables: tpl.variables,
        is_active: true
      })
      .select()
      .single();
    
    if (tplErr) {
      console.log('❌', auto.name, '-', tplErr.message);
      continue;
    }
    
    // Link to automation
    await supabase
      .from('email_automations')
      .update({ template_id: newTpl.id })
      .eq('id', auto.id);
    
    console.log('✅ Created & linked:', auto.name);
  }
  
  // Final status
  console.log('\n📋 Final Automation Status:');
  const { data: finalAutos } = await supabase
    .from('email_automations')
    .select('name, trigger_type, template_id, is_active');
  
  finalAutos?.forEach(a => {
    const status = a.template_id ? '✅' : '❌';
    console.log(`   ${status} ${a.name}`);
  });
  
  console.log('\n🏁 Done!\n');
}

createTemplates().catch(console.error);
