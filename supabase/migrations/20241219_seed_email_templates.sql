-- Seed default email templates for campaigns

-- Welcome Email Template
INSERT INTO email_templates (name, subject, template_type, html_content, variables, is_active)
VALUES (
  'Welcome Email',
  'Welcome to 9RX! 🎉',
  'welcome',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <tr>
      <td style="padding: 40px 30px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
        <h1 style="color: #ffffff; margin: 0; font-size: 32px;">Welcome to 9RX!</h1>
      </td>
    </tr>
    <tr>
      <td style="padding: 40px 30px;">
        <h2 style="color: #333333; margin: 0 0 20px;">Hello {{user_name}}! 👋</h2>
        <p style="color: #666666; line-height: 1.6; margin: 0 0 20px;">
          Thank you for joining 9RX! We''re excited to have you as part of our community.
        </p>
        <p style="color: #666666; line-height: 1.6; margin: 0 0 20px;">
          As a welcome gift, here''s <strong>10% off</strong> your first order. Use code: <strong style="color: #667eea;">WELCOME10</strong>
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://9rx.com/pharmacy/products" style="display: inline-block; padding: 14px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
            Start Shopping
          </a>
        </div>
        <p style="color: #666666; line-height: 1.6; margin: 20px 0 0;">
          If you have any questions, our support team is here to help!
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding: 30px; background-color: #f8f9fa; text-align: center;">
        <p style="color: #999999; font-size: 12px; margin: 0;">
          © 2024 9RX. All rights reserved.<br>
          <a href="{{unsubscribe_url}}" style="color: #999999;">Unsubscribe</a> | <a href="https://9rx.com" style="color: #999999;">Visit Website</a>
        </p>
      </td>
    </tr>
  </table>
</body>
</html>',
  ARRAY['user_name', 'unsubscribe_url'],
  true
) ON CONFLICT DO NOTHING;
-- Flash Sale Template
INSERT INTO email_templates (name, subject, template_type, html_content, variables, is_active)
VALUES (
  'Flash Sale',
  '⚡ 24-Hour Flash Sale - Up to 50% Off!',
  'promotional',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <tr>
      <td style="padding: 40px 30px; text-align: center; background: linear-gradient(135deg, #ff416c 0%, #ff4b2b 100%);">
        <h1 style="color: #ffffff; margin: 0; font-size: 36px;">⚡ FLASH SALE ⚡</h1>
        <p style="color: #ffffff; font-size: 20px; margin: 10px 0 0;">24 Hours Only!</p>
      </td>
    </tr>
    <tr>
      <td style="padding: 40px 30px; text-align: center;">
        <h2 style="color: #333333; margin: 0 0 10px; font-size: 48px;">UP TO 50% OFF</h2>
        <p style="color: #666666; line-height: 1.6; margin: 0 0 30px; font-size: 18px;">
          Don''t miss out on our biggest sale of the season!
        </p>
        <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin-bottom: 30px;">
          <p style="margin: 0; color: #856404; font-weight: bold;">
            ⏰ Sale ends in 24 hours!
          </p>
        </div>
        <a href="https://9rx.com/pharmacy/products" style="display: inline-block; padding: 16px 50px; background: linear-gradient(135deg, #ff416c 0%, #ff4b2b 100%); color: #ffffff; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 18px;">
          SHOP NOW
        </a>
      </td>
    </tr>
    <tr>
      <td style="padding: 30px; background-color: #f8f9fa; text-align: center;">
        <p style="color: #999999; font-size: 12px; margin: 0;">
          © 2024 9RX. All rights reserved.<br>
          <a href="{{unsubscribe_url}}" style="color: #999999;">Unsubscribe</a>
        </p>
      </td>
    </tr>
  </table>
</body>
</html>',
  ARRAY['user_name', 'unsubscribe_url'],
  true
) ON CONFLICT DO NOTHING;
-- New Products Template
INSERT INTO email_templates (name, subject, template_type, html_content, variables, is_active)
VALUES (
  'New Products Announcement',
  '🆕 New Arrivals Just Dropped!',
  'product_spotlight',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <tr>
      <td style="padding: 40px 30px; text-align: center; background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);">
        <h1 style="color: #ffffff; margin: 0; font-size: 32px;">🆕 New Arrivals!</h1>
      </td>
    </tr>
    <tr>
      <td style="padding: 40px 30px;">
        <h2 style="color: #333333; margin: 0 0 20px;">Hey {{user_name}}!</h2>
        <p style="color: #666666; line-height: 1.6; margin: 0 0 20px;">
          We''ve just added some amazing new products to our catalog. Be the first to check them out!
        </p>
        <p style="color: #666666; line-height: 1.6; margin: 0 0 30px;">
          From essential pharmacy supplies to the latest healthcare products, we''ve got everything you need.
        </p>
        <div style="text-align: center;">
          <a href="https://9rx.com/pharmacy/products" style="display: inline-block; padding: 14px 40px; background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); color: #ffffff; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
            View New Products
          </a>
        </div>
      </td>
    </tr>
    <tr>
      <td style="padding: 30px; background-color: #f8f9fa; text-align: center;">
        <p style="color: #999999; font-size: 12px; margin: 0;">
          © 2024 9RX. All rights reserved.<br>
          <a href="{{unsubscribe_url}}" style="color: #999999;">Unsubscribe</a>
        </p>
      </td>
    </tr>
  </table>
</body>
</html>',
  ARRAY['user_name', 'unsubscribe_url'],
  true
) ON CONFLICT DO NOTHING;
-- Win-Back Campaign Template
INSERT INTO email_templates (name, subject, template_type, html_content, variables, is_active)
VALUES (
  'Win-Back Campaign',
  'We Miss You! Here''s 15% Off 💝',
  'promotional',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <tr>
      <td style="padding: 40px 30px; text-align: center; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);">
        <h1 style="color: #ffffff; margin: 0; font-size: 32px;">We Miss You! 💝</h1>
      </td>
    </tr>
    <tr>
      <td style="padding: 40px 30px; text-align: center;">
        <h2 style="color: #333333; margin: 0 0 20px;">Hey {{user_name}}, it''s been a while!</h2>
        <p style="color: #666666; line-height: 1.6; margin: 0 0 20px;">
          We noticed you haven''t visited us in a while, and we wanted to let you know we miss you!
        </p>
        <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 30px; border-radius: 10px; margin: 30px 0;">
          <p style="color: #ffffff; font-size: 24px; margin: 0 0 10px; font-weight: bold;">15% OFF</p>
          <p style="color: #ffffff; margin: 0;">Use code: <strong>COMEBACK15</strong></p>
        </div>
        <a href="https://9rx.com/pharmacy/products" style="display: inline-block; padding: 14px 40px; background: #333333; color: #ffffff; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
          Shop Now
        </a>
      </td>
    </tr>
    <tr>
      <td style="padding: 30px; background-color: #f8f9fa; text-align: center;">
        <p style="color: #999999; font-size: 12px; margin: 0;">
          © 2024 9RX. All rights reserved.<br>
          <a href="{{unsubscribe_url}}" style="color: #999999;">Unsubscribe</a>
        </p>
      </td>
    </tr>
  </table>
</body>
</html>',
  ARRAY['user_name', 'unsubscribe_url'],
  true
) ON CONFLICT DO NOTHING;
-- Monthly Newsletter Template
INSERT INTO email_templates (name, subject, template_type, html_content, variables, is_active)
VALUES (
  'Monthly Newsletter',
  '📰 Your Monthly 9RX Newsletter',
  'newsletter',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <tr>
      <td style="padding: 40px 30px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
        <h1 style="color: #ffffff; margin: 0; font-size: 28px;">📰 9RX Newsletter</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0;">Your monthly dose of pharmacy news</p>
      </td>
    </tr>
    <tr>
      <td style="padding: 40px 30px;">
        <h2 style="color: #333333; margin: 0 0 20px;">Hello {{user_name}}!</h2>
        <p style="color: #666666; line-height: 1.6; margin: 0 0 20px;">
          Here''s what''s new at 9RX this month:
        </p>
        
        <div style="border-left: 4px solid #667eea; padding-left: 20px; margin: 20px 0;">
          <h3 style="color: #333; margin: 0 0 10px;">🆕 New Products</h3>
          <p style="color: #666; margin: 0;">Check out our latest additions to the catalog.</p>
        </div>
        
        <div style="border-left: 4px solid #11998e; padding-left: 20px; margin: 20px 0;">
          <h3 style="color: #333; margin: 0 0 10px;">💡 Tips & Tricks</h3>
          <p style="color: #666; margin: 0;">Learn how to optimize your pharmacy operations.</p>
        </div>
        
        <div style="border-left: 4px solid #f5576c; padding-left: 20px; margin: 20px 0;">
          <h3 style="color: #333; margin: 0 0 10px;">🎉 Special Offers</h3>
          <p style="color: #666; margin: 0;">Exclusive deals for our newsletter subscribers.</p>
        </div>
        
        <div style="text-align: center; margin-top: 30px;">
          <a href="https://9rx.com" style="display: inline-block; padding: 14px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 5px; font-weight: bold;">
            Visit 9RX
          </a>
        </div>
      </td>
    </tr>
    <tr>
      <td style="padding: 30px; background-color: #f8f9fa; text-align: center;">
        <p style="color: #999999; font-size: 12px; margin: 0;">
          © 2024 9RX. All rights reserved.<br>
          <a href="{{unsubscribe_url}}" style="color: #999999;">Unsubscribe</a> | <a href="https://9rx.com" style="color: #999999;">Visit Website</a>
        </p>
      </td>
    </tr>
  </table>
</body>
</html>',
  ARRAY['user_name', 'unsubscribe_url'],
  true
) ON CONFLICT DO NOTHING;
