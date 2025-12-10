import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const AUTHORIZE_NET_SANDBOX = "https://apitest.authorize.net/xml/v1/request.api";
const AUTHORIZE_NET_PRODUCTION = "https://api.authorize.net/xml/v1/request.api";

interface RefundRequest {
  transactionId: string;
  amount: number;
  cardNumber?: string; // Last 4 digits for card refunds
  orderId?: string;
  reason?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const API_LOGIN_ID = Deno.env.get("AUTHORIZE_NET_API_LOGIN_ID");
    const TRANSACTION_KEY = Deno.env.get("AUTHORIZE_NET_TRANSACTION_KEY");
    const IS_PRODUCTION = Deno.env.get("AUTHORIZE_NET_PRODUCTION") === "true";

    if (!API_LOGIN_ID || !TRANSACTION_KEY) {
      throw new Error("Missing Authorize.Net API credentials");
    }

    const body: RefundRequest = await req.json();
    const { transactionId, amount, cardNumber, orderId, reason } = body;

    if (!transactionId || !amount) {
      return new Response(
        JSON.stringify({ success: false, error: "Transaction ID and amount are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const endpoint = IS_PRODUCTION ? AUTHORIZE_NET_PRODUCTION : AUTHORIZE_NET_SANDBOX;

    // Build refund request
    const refundRequest: any = {
      createTransactionRequest: {
        merchantAuthentication: {
          name: API_LOGIN_ID,
          transactionKey: TRANSACTION_KEY,
        },
        refId: `REFUND-${Date.now()}`,
        transactionRequest: {
          transactionType: "refundTransaction",
          amount: amount.toFixed(2),
          refTransId: transactionId,
        },
      },
    };

    // Add card info if provided (required for card refunds)
    if (cardNumber) {
      refundRequest.createTransactionRequest.transactionRequest.payment = {
        creditCard: {
          cardNumber: cardNumber,
          expirationDate: "XXXX", // Authorize.Net accepts XXXX for refunds
        },
      };
    }

    console.log("Sending refund request to Authorize.Net");

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(refundRequest),
    });

    const responseText = await response.text();
    const cleanResponse = responseText.replace(/^\uFEFF/, "");
    const result = JSON.parse(cleanResponse);

    console.log("Authorize.Net refund response:", JSON.stringify(result, null, 2));

    const messages = result.messages;
    const transactionResponse = result.transactionResponse;

    if (messages?.resultCode === "Ok" && transactionResponse?.responseCode === "1") {
      // Log refund to Supabase
      if (orderId) {
        try {
          const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
          const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
          const supabase = createClient(supabaseUrl, supabaseKey);

          await supabase.from("order_activities").insert({
            order_id: orderId,
            activity_type: "refund_processed",
            description: `Refund of $${amount.toFixed(2)} processed${reason ? `: ${reason}` : ""}`,
            metadata: {
              original_transaction_id: transactionId,
              refund_transaction_id: transactionResponse.transId,
              amount: amount,
              reason: reason,
            },
          });
        } catch (logError) {
          console.error("Failed to log refund activity:", logError);
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          refundTransactionId: transactionResponse.transId,
          message: "Refund processed successfully",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      let errorMessage = "Refund failed";
      let errorCode = "";

      if (transactionResponse?.errors?.error) {
        const errors = Array.isArray(transactionResponse.errors.error)
          ? transactionResponse.errors.error
          : [transactionResponse.errors.error];
        errorMessage = errors[0]?.errorText || errorMessage;
        errorCode = errors[0]?.errorCode || "";
      } else if (messages?.message) {
        const msgArray = Array.isArray(messages.message) ? messages.message : [messages.message];
        errorMessage = msgArray[0]?.text || errorMessage;
        errorCode = msgArray[0]?.code || "";
      }

      return new Response(
        JSON.stringify({ success: false, error: errorMessage, errorCode }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("Refund processing error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
