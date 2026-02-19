#!/bin/bash

# Get your access token from https://supabase.com/dashboard/account/tokens
export SUPABASE_ACCESS_TOKEN="your-access-token-here"
export PROJECT_REF="qiaetxkxweghuoxyhvml"

# Configure custom SMTP using Gmail settings from server/.env
curl -X PATCH "https://api.supabase.com/v1/projects/$PROJECT_REF/config/auth" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "external_email_enabled": true,
    "mailer_secure_email_change_enabled": true,
    "mailer_autoconfirm": false,
    "smtp_admin_email": "info@9rx.com",
    "smtp_host": "smtp.gmail.com",
    "smtp_port": 587,
    "smtp_user": "jayvekariya2003@gmail.com",
    "smtp_pass": "prev rsug lfly qqlr",
    "smtp_sender_name": "9RX"
  }'
