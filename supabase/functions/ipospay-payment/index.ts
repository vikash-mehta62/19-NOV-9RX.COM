import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ============================================
// 🔧 HARDCODED CREDENTIALS - UPDATE THESE
// ============================================
const IPOSPAY_CONFIG = {
  enabled: true,
  testMode: true, // true = Sandbox, false = Production
  
  // 📝 SANDBOX CREDENTIALS (for testing)
  sandbox: {
    tpn: "133526975132",           // Get from devsupport@dejavoo.io
    authToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0cG4iOiIxMzM1MjY5NzUxMzIiLCJlbWFpbCI6InNwcGF0ZWxAOXJ4LmNvbSIsIm1lcmNoYW50SWQiOiI0M2M1NWUwOC1iMmEzLTRlMjctYjU2Mi01YWNlMWQ2MjNiMmIiLCJ2ZXJzaW9uIjoidjIiLCJpYXQiOjE3NzU4NDU0OTB9.7Ojn-EBCYQFatBq_84kCmOg53nzqjkH4DYc8YdM0ox0", // Get from iPOS Pays dashboard
  },
  
  // 🚀 PRODUCTION CREDENTIALS (for live)
  production: {
    tpn: "YOUR_PRODUCTION_TPN_HERE",
    authToken: "YOUR_PRODUCTION_AUTH_TOKEN_HERE",
  },
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // NOTE: We ignore authentication for hardcoded credentials testing
    // In production, you should validate the Authorization header
    
    // Parse request body
    const body = await req.json();
    const { action, ...params } = body;

    console.log("iPOS Pay request:", { action });

    // Check if iPOS Pays is enabled
    if (!IPOSPAY_CONFIG.enabled) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "iPOS Pays is disabled in edge function config",
          errorCode: "GATEWAY_DISABLED",
        }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200 
        }
      );
    }

    // Get credentials based on test mode
    const credentials = IPOSPAY_CONFIG.testMode 
      ? IPOSPAY_CONFIG.sandbox 
      : IPOSPAY_CONFIG.production;

    // Validate credentials
    if (!credentials.tpn || !credentials.authToken) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "iPOS Pays credentials not configured in edge function. Please update IPOSPAY_CONFIG.",
          errorCode: "INVALID_CREDENTIALS",
        }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200 
        }
      );
    }

    // Determine API URLs based on test mode
    const baseUrl = IPOSPAY_CONFIG.testMode
      ? "https://payment.ipospays.tech/api/v1"
      : "https://payment.ipospays.com/api/v1";

    const queryBaseUrl = IPOSPAY_CONFIG.testMode
      ? "https://api.ipospays.tech/v1"
      : "https://api.ipospays.com/v1";

    console.log("Using iPOS Pays environment:", IPOSPAY_CONFIG.testMode ? "SANDBOX" : "PRODUCTION");
    console.log("TPN:", credentials.tpn);

    // Handle different actions
    if (action === "generatePaymentUrl") {
      // Generate unique transaction reference ID (alphanumeric, max 50 chars)
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 12).toUpperCase();
      const transactionReferenceId = `TXN${timestamp}${randomStr}`;
      
      // Convert amount to cents (multiply by 100)
      const amountInCents = Math.round(params.amount * 100).toString();
      
      console.log("Generating payment URL:", {
        transactionReferenceId,
        amount: params.amount,
        amountInCents,
        orderId: params.orderId,
      });

      // Build iPOS Pays API payload
      const payload = {
        merchantAuthentication: {
          merchantId: credentials.tpn,
          transactionReferenceId,
        },
        transactionRequest: {
          transactionType: 1, // 1 = SALE
          amount: amountInCents,
          calculateFee: params.calculateFee ?? true,
          tipsInputPrompt: params.tipsInputPrompt ?? false,
          calculateTax: params.calculateTax ?? true,
        },
        notificationOption: {
          notifyBySMS: false,
          mobileNumber: "",
          notifyByPOST: false,
          authHeader: "",
          postAPI: "",
          notifyByRedirect: true,
          returnUrl: params.returnUrl,
          failureUrl: params.failureUrl || params.returnUrl,
          cancelUrl: params.cancelUrl || params.returnUrl,
        },
        preferences: {
          integrationType: 1, // 1 = E-Commerce
          avsVerification: true,
          eReceipt: !!params.customerEmail || !!params.customerMobile,
          eReceiptInputPrompt: !params.customerEmail && !params.customerMobile,
          customerName: params.customerName || "",
          customerEmail: params.customerEmail || "",
          customerMobile: params.customerMobile || "",
          requestCardToken: true, // Enable for saved cards
          shortenURL: false,
          sendPaymentLink: false,
          integrationVersion: "v2",
          // ✅ Enable ACH payment option
          enableACH: true, // Show ACH/Bank option on payment page
        },
        personalization: {
          merchantName: params.merchantName || "9RX Pharmacy",
          logoUrl: params.logoUrl || "",
          themeColor: params.themeColor || "#4F46E5",
          description: params.description || `Order #${params.orderId || ""}`,
          payNowButtonText: "Pay Now",
          buttonColor: params.themeColor || "#4F46E5",
          cancelButtonText: "Cancel",
          disclaimer: "",
        },
      };

      console.log("Calling iPOS Pays API:", `${baseUrl}/external-payment-transaction`);

      // Call iPOS Pays API
      const response = await fetch(`${baseUrl}/external-payment-transaction`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "token": credentials.authToken,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      console.log("iPOS Pays response:", data);

      // Check if URL was generated successfully
      if (data.message === "Url generated Successful" || data.message === "URL generated successfully") {
        return new Response(
          JSON.stringify({
            success: true,
            paymentUrl: data.information,
            transactionReferenceId,
            message: "Payment URL generated successfully",
          }),
          { 
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200 
          }
        );
      } else {
        // Handle errors
        const errorMessage = data.errors?.[0]?.message || "Failed to generate payment URL";
        console.error("iPOS Pays error:", data.errors);
        
        return new Response(
          JSON.stringify({
            success: false,
            error: errorMessage,
            errors: data.errors,
            errorCode: "PAYMENT_URL_GENERATION_FAILED",
          }),
          { 
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200 
          }
        );
      }
    } 
    else if (action === "queryPaymentStatus") {
      // Query payment status
      console.log("Querying payment status:", params.transactionReferenceId);

      const response = await fetch(
        `${queryBaseUrl}/queryPaymentStatus?tpn=${credentials.tpn}&transactionReferenceId=${params.transactionReferenceId}`,
        {
          method: "GET",
          headers: {
            "Authorization": credentials.authToken,
          },
        }
      );

      const data = await response.json();
      console.log("Query response:", data);

      return new Response(
        JSON.stringify({
          success: true,
          data: data.iposHPResponse,
        }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200 
        }
      );
    }
    else {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Invalid action. Use 'generatePaymentUrl' or 'queryPaymentStatus'",
          errorCode: "INVALID_ACTION",
        }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400 
        }
      );
    }
  } catch (error: any) {
    console.error("iPOS Pay error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Internal server error",
        errorCode: "INTERNAL_ERROR",
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" }, 
        status: 500 
      }
    );
  }
});
