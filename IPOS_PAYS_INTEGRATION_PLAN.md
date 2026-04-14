# iPOS Pays Integration Plan

## Overview
iPOS Pays uses a Hosted Payment Page (HPP) approach where customers are redirected to a secure payment page. This is different from FortisPay's direct API integration.

## Key Components Needed

### 1. Backend Service (Supabase Edge Function)
- Generate payment URL using iPOS Pays API
- Handle payment callbacks/webhooks
- Query payment status

### 2. Frontend Service
- Create payment request
- Redirect to iPOS Pays HPP
- Handle return from payment page
- Display payment status

### 3. Settings Configuration
- TPN (Terminal Provider Number)
- Auth Token
- Sandbox/Production mode toggle
- Callback URLs

## API Endpoints

### Sandbox (UAT)
- Payment URL: `https://payment.ipospays.tech/api/v1/external-payment-transaction`
- Query API: `https://api.ipospays.tech/v1/queryPaymentStatus`

### Production
- Payment URL: `https://payment.ipospays.com/api/v1/external-payment-transaction`
- Query API: `https://api.ipospays.com/v1/queryPaymentStatus`

## Integration Flow

### Payment Flow:
1. User initiates payment on your site
2. Backend calls iPOS Pays API to generate payment URL
3. User is redirected to iPOS Pays HPP
4. User completes payment on iPOS Pays page
5. iPOS Pays redirects back to your return URL with payment status
6. Your backend processes the callback
7. Display success/failure to user

### Notification Methods:
- **notifyByRedirect**: For e-commerce (recommended)
- **notifyByPOST**: Real-time webhook to your API
- **notifyBySMS**: SMS notification to merchant

## Required Fields

### Mandatory:
- `merchantId` (TPN)
- `transactionReferenceId` (unique per transaction)
- `transactionType` (1 = SALE, 2 = CARD VALIDATION)
- `amount` (multiply by 100, e.g., $100 = 10000)
- `tipsInputPrompt` (true/false)
- `calculateTax` (true/false)
- `integrationType` (1 = E-Commerce)
- `avsVerification` (true/false)
- `eReceipt` (true/false)
- `requestCardToken` (true/false for saved cards)

### Optional but Recommended:
- `personalization` (logo, theme, colors)
- `customerName`, `customerEmail`, `customerMobile`
- `returnUrl`, `failureUrl`, `cancelUrl`

## Implementation Steps

### Step 1: Create iPOS Pays Service
Create `src/services/iPosPayService.ts` with:
- Generate payment URL function
- Query payment status function
- Validate payment response function

### Step 2: Update Edge Function
Modify `supabase/functions/process-payment/index.ts` to:
- Add iPOS Pays processor option
- Generate payment URL
- Handle callbacks

### Step 3: Update Settings
Add to `src/pages/admin/Settings.tsx`:
- iPOS Pays TPN
- Auth Token
- Sandbox/Production toggle
- Return URLs configuration

### Step 4: Update Payment Flow
Modify payment components to:
- Support redirect-based payment
- Handle return from iPOS Pays
- Display payment status

### Step 5: Database Updates
Add to `payment_settings` table:
- iPOS Pays credentials
- Configuration options

## Response Handling

### Success Response (200):
```json
{
  "iposHPResponse": {
    "responseCode": 200,
    "responseMessage": "Successful",
    "transactionId": "...",
    "transactionNumber": "...",
    "cardToken": "...",
    "amount": "...",
    "totalAmount": "..."
  }
}
```

### Failure Response (400):
```json
{
  "iposHPResponse": {
    "responseCode": 400,
    "responseMessage": "Declined",
    "errResponseCode": "...",
    "errResponseMessage": "..."
  }
}
```

## Security Considerations

1. **Auth Token**: Store securely in environment variables
2. **Callback Validation**: Verify callbacks are from iPOS Pays
3. **Transaction Reference**: Use unique, non-guessable IDs
4. **HTTPS Only**: All URLs must be HTTPS
5. **Amount Validation**: Verify amounts match on callback

## Testing

### Sandbox Testing:
1. Get sandbox TPN and auth token
2. Set `fedex_use_sandbox` equivalent for iPOS Pays
3. Test with sandbox credentials
4. Verify callbacks work correctly

### Production Checklist:
- [ ] Production TPN obtained
- [ ] Production auth token generated
- [ ] Return URLs configured (HTTPS)
- [ ] Callback endpoint tested
- [ ] Error handling implemented
- [ ] Transaction logging working
- [ ] Customer notifications configured

## Migration from FortisPay

### Differences:
| Feature | FortisPay | iPOS Pays |
|---------|-----------|-----------|
| Integration | Direct API | Hosted Page |
| Card Entry | Your form | Their form |
| PCI Compliance | Your responsibility | Their responsibility |
| ACH Support | Yes | Yes |
| Card Support | Yes | Yes |
| Tokenization | Yes | Yes (requestCardToken) |

### Migration Steps:
1. Keep FortisPay code for backward compatibility
2. Add iPOS Pays as new processor option
3. Update settings to allow processor selection
4. Test both processors in parallel
5. Gradually migrate customers
6. Eventually deprecate FortisPay

## Advantages of iPOS Pays

1. **PCI Compliance**: They handle card data, reducing your PCI scope
2. **Hosted Page**: No need to build secure payment forms
3. **Multiple Payment Methods**: Cards + ACH on same page
4. **Customization**: Logo, colors, theme
5. **Mobile Friendly**: Responsive payment page
6. **Level 3 Data**: Support for commercial cards

## Next Steps

1. Get iPOS Pays credentials (TPN + Auth Token)
2. Implement service layer
3. Update edge function
4. Add settings UI
5. Test in sandbox
6. Deploy to production
