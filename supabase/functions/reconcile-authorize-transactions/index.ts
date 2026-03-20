import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-user-jwt",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const AUTHORIZE_NET_SANDBOX = "https://apitest.authorize.net/xml/v1/request.api";
const AUTHORIZE_NET_PRODUCTION = "https://api.authorize.net/xml/v1/request.api";

type JsonRecord = Record<string, unknown>;

type PaymentTransactionRow = {
  id: string;
  transaction_id: string | null;
  status: string | null;
  amount: number | string | null;
  transaction_type: string | null;
  gateway_batch_id?: string | null;
};

type AuthenticatedAdmin = {
  id: string;
  email: string | null;
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizeGatewayStatus(value: string | null | undefined): string {
  return String(value || "").trim().toLowerCase();
}

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

function statusesMatch(localStatus: string | null | undefined, gatewayStatus: string) {
  const normalizedLocal = String(localStatus || "").trim().toLowerCase();

  if (!normalizedLocal) return false;

  if (normalizedLocal === "approved") {
    return [
      "capturedpendingsettlement",
      "settledsuccessfully",
      "authorizedpendingcapture",
      "pendingfinalsettlement",
      "underreview",
      "approvedreview",
    ].includes(gatewayStatus);
  }

  if (normalizedLocal === "pending") {
    return [
      "authorizedpendingcapture",
      "capturedpendingsettlement",
      "pendingfinalsettlement",
      "underreview",
    ].includes(gatewayStatus);
  }

  if (normalizedLocal === "refunded") {
    return [
      "refundsettledsuccessfully",
      "refundpendingsettlement",
      "returneditem",
      "chargeback",
    ].includes(gatewayStatus);
  }

  if (normalizedLocal === "voided") {
    return gatewayStatus === "voided";
  }

  if (normalizedLocal === "declined" || normalizedLocal === "error") {
    return [
      "declined",
      "generalerror",
      "failedreview",
      "communicationerror",
    ].includes(gatewayStatus);
  }

  return normalizedLocal === gatewayStatus;
}

function asArray<T>(value: T | T[] | null | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function money(value: number) {
  return Number(value.toFixed(2));
}

function parseNumber(value: unknown) {
  const numeric = Number(value || 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

function parseSettlementDate(value: unknown) {
  const normalized = normalizeText(value);
  return normalized ? normalized.slice(0, 10) : null;
}

function toIsoNoMs(date: Date) {
  return date.toISOString().replace(/\.\d{3}Z$/, "Z");
}

async function callAuthorizeNet(
  endpoint: string,
  apiLoginId: string,
  transactionKey: string,
  payload: Record<string, unknown>,
) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const rawText = await response.text();
  let parsed: any = null;

  try {
    parsed = JSON.parse(rawText.replace(/^\uFEFF/, ""));
  } catch {
    parsed = null;
  }

  return { ok: response.ok, rawText, parsed };
}

async function getTransactionDetails(
  endpoint: string,
  apiLoginId: string,
  transactionKey: string,
  transactionId: string,
) {
  return callAuthorizeNet(endpoint, apiLoginId, transactionKey, {
    getTransactionDetailsRequest: {
      merchantAuthentication: {
        name: apiLoginId,
        transactionKey,
      },
      transId: transactionId,
    },
  });
}

async function getSettledBatchList(
  endpoint: string,
  apiLoginId: string,
  transactionKey: string,
  firstSettlementDate: string,
  lastSettlementDate: string,
) {
  return callAuthorizeNet(endpoint, apiLoginId, transactionKey, {
    getSettledBatchListRequest: {
      merchantAuthentication: {
        name: apiLoginId,
        transactionKey,
      },
      includeStatistics: true,
      firstSettlementDate,
      lastSettlementDate,
    },
  });
}

async function getTransactionList(
  endpoint: string,
  apiLoginId: string,
  transactionKey: string,
  batchId: string,
) {
  return callAuthorizeNet(endpoint, apiLoginId, transactionKey, {
    getTransactionListRequest: {
      merchantAuthentication: {
        name: apiLoginId,
        transactionKey,
      },
      batchId,
    },
  });
}

async function authenticateAdmin(
  req: Request,
  supabaseUrl: string,
  supabaseAnonKey: string,
  supabaseServiceKey: string,
) {
  const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
  if (!authHeader?.toLowerCase().startsWith("bearer ")) {
    return { error: "Missing bearer token.", admin: null as AuthenticatedAdmin | null };
  }

  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
  });

  const { data: userData, error: userError } = await authClient.auth.getUser();
  if (userError || !userData.user) {
    return { error: "Invalid or expired session.", admin: null as AuthenticatedAdmin | null };
  }

  const serviceClient = createClient(supabaseUrl, supabaseServiceKey);
  const { data: profile, error: profileError } = await serviceClient
    .from("profiles")
    .select("id, email, type, role")
    .eq("id", userData.user.id)
    .maybeSingle();

  if (profileError) {
    return { error: profileError.message, admin: null as AuthenticatedAdmin | null };
  }

  const type = String(profile?.type || "").toLowerCase();
  const role = String(profile?.role || "").toLowerCase();
  const isAdmin = type === "admin" || role === "admin" || role === "superadmin";

  if (!isAdmin) {
    return { error: "Admin access required.", admin: null as AuthenticatedAdmin | null };
  }

  return {
    error: null,
    admin: {
      id: userData.user.id,
      email: userData.user.email || null,
    } satisfies AuthenticatedAdmin,
  };
}

function extractGatewayTransactions(responseRoot: any) {
  const transactions = asArray(
    responseRoot?.transactions?.transaction ||
      responseRoot?.transaction ||
      responseRoot?.transactions,
  );

  return transactions
    .map((transaction) => {
      const transactionId = normalizeText(transaction?.transId);
      if (!transactionId) return null;

      return {
        transactionId,
        amount: parseNumber(transaction?.settleAmount ?? transaction?.amount),
        status: normalizeGatewayStatus(transaction?.transactionStatus),
      };
    })
    .filter(Boolean) as Array<{ transactionId: string; amount: number; status: string }>;
}

function buildMismatchCategory(input: {
  missingLocalCount: number;
  missingGatewayCount: number;
  gatewayAmount: number;
  localAmount: number;
  statementNetAmount?: number | null;
  statementFeeAmount?: number | null;
}) {
  if (input.missingLocalCount > 0) return "missing_local";
  if (input.missingGatewayCount > 0) return "missing_gateway";

  if (
    input.statementNetAmount != null &&
    input.statementFeeAmount != null &&
    Math.abs(money(input.gatewayAmount - input.statementFeeAmount) - money(input.statementNetAmount)) >= 0.01
  ) {
    return "net_formula_mismatch";
  }

  if (Math.abs(money(input.gatewayAmount) - money(input.localAmount)) >= 0.01) {
    return "amount_mismatch";
  }

  return null;
}

async function syncGatewayBatches(params: {
  supabase: ReturnType<typeof createClient>;
  endpoint: string;
  apiLoginId: string;
  transactionKey: string;
  adminId: string;
  daysBack: number;
}) {
  const firstSettlementDate = toIsoNoMs(new Date(Date.now() - params.daysBack * 24 * 60 * 60 * 1000));
  const lastSettlementDate = toIsoNoMs(new Date(Date.now() + 24 * 60 * 60 * 1000));

  const settledBatchResponse = await getSettledBatchList(
    params.endpoint,
    params.apiLoginId,
    params.transactionKey,
    firstSettlementDate,
    lastSettlementDate,
  );

  const responseRoot =
    settledBatchResponse.parsed?.batchListResponse ||
    settledBatchResponse.parsed?.getSettledBatchListResponse ||
    settledBatchResponse.parsed;

  const batchList = asArray(
    responseRoot?.batchList?.batch ||
      responseRoot?.batchList,
  );

  const summary = {
    batchesChecked: 0,
    batchesUpserted: 0,
  };

  for (const batch of batchList) {
    const batchId = normalizeText(batch?.batchId);
    if (!batchId) continue;

    summary.batchesChecked += 1;

    const transactionListResponse = await getTransactionList(
      params.endpoint,
      params.apiLoginId,
      params.transactionKey,
      batchId,
    );

    const transactionListRoot =
      transactionListResponse.parsed?.transactionListResponse ||
      transactionListResponse.parsed?.getTransactionListResponse ||
      transactionListResponse.parsed;

    const gatewayTransactions = extractGatewayTransactions(transactionListRoot);
    const gatewayTransactionIds = gatewayTransactions.map((transaction) => transaction.transactionId);
    const gatewayAmount = money(gatewayTransactions.reduce((sum, transaction) => sum + transaction.amount, 0));
    const settlementDate = parseSettlementDate(batch?.settlementTimeUTC || batch?.settlementTimeLocal);
    const batchStatistics = asArray(batch?.statistics?.statistic);
    const transactionCountFromStats = batchStatistics.reduce((sum, statistic) => {
      const name = normalizeText((statistic as any)?.accountType);
      if (!name) return sum;
      return sum + parseInt(String((statistic as any)?.chargeCount || 0), 10);
    }, 0);

    const { data: localRows, error: localRowsError } = await params.supabase
      .from("payment_transactions")
      .select("id, transaction_id, amount")
      .in("transaction_id", gatewayTransactionIds.length > 0 ? gatewayTransactionIds : ["__none__"]);

    if (localRowsError) {
      throw new Error(localRowsError.message);
    }

    const matchedLocalRows = (localRows || []) as Array<{ id: string; transaction_id: string; amount: number }>;
    const matchedLocalIds = new Set(matchedLocalRows.map((row) => row.transaction_id));

    const { data: existingBatchRows, error: existingBatchRowsError } = await params.supabase
      .from("payment_transactions")
      .select("id, transaction_id")
      .eq("gateway_batch_id", batchId);

    if (existingBatchRowsError) {
      throw new Error(existingBatchRowsError.message);
    }

    const existingBatchTransactionIds = new Set(
      (existingBatchRows || []).map((row: any) => normalizeText(row.transaction_id)).filter(Boolean),
    );

    const missingLocalCount = gatewayTransactions.filter(
      (transaction) => !matchedLocalIds.has(transaction.transactionId),
    ).length;

    const missingGatewayCount = Array.from(existingBatchTransactionIds).filter(
      (transactionId) => !gatewayTransactionIds.includes(transactionId),
    ).length;

    const localAmount = money(matchedLocalRows.reduce((sum, row) => sum + parseNumber(row.amount), 0));
    const mismatchCategory = buildMismatchCategory({
      missingLocalCount,
      missingGatewayCount,
      gatewayAmount,
      localAmount,
    });

    const transactionCount = gatewayTransactions.length || transactionCountFromStats;

    const { data: existingBatch, error: existingBatchError } = await params.supabase
      .from("payment_reconciliation_batches")
      .select("id, processor_statement_entry_id, processor_fee_amount, expected_net_amount, bank_deposit_amount, reconciliation_status")
      .eq("gateway_batch_id", batchId)
      .maybeSingle();

    if (existingBatchError) {
      throw new Error(existingBatchError.message);
    }

    const processorFeeAmount = parseNumber(existingBatch?.processor_fee_amount);
    const expectedNetAmount = existingBatch?.expected_net_amount != null
      ? parseNumber(existingBatch.expected_net_amount)
      : money(gatewayAmount - processorFeeAmount);

    const differenceAmount = existingBatch?.bank_deposit_amount != null
      ? money(parseNumber(existingBatch.bank_deposit_amount) - expectedNetAmount)
      : money(expectedNetAmount);

    const reconciliationStatus =
      mismatchCategory || Math.abs(differenceAmount) >= 0.01
        ? "review_required"
        : existingBatch?.reconciliation_status || "unmatched";

    const upsertPayload = {
      id: existingBatch?.id,
      payment_settings_profile_id: params.adminId,
      gateway_batch_id: batchId,
      settlement_date: settlementDate,
      gateway_amount: gatewayAmount,
      local_amount: localAmount,
      transaction_count: transactionCount,
      gateway_transaction_count: transactionCount,
      local_transaction_count: matchedLocalRows.length,
      missing_local_count: missingLocalCount,
      missing_gateway_count: missingGatewayCount,
      mismatch_category: mismatchCategory,
      gateway_status: normalizeText(batch?.settlementState) || "settled",
      gateway_reported_at: new Date().toISOString(),
      gateway_payload: {
        batch,
        transactions: gatewayTransactions,
      },
      expected_net_amount: expectedNetAmount,
      difference_amount: differenceAmount,
      last_synced_at: new Date().toISOString(),
      reconciliation_status: reconciliationStatus,
      updated_at: new Date().toISOString(),
    };

    const { error: upsertError } = await params.supabase
      .from("payment_reconciliation_batches")
      .upsert(upsertPayload, { onConflict: "gateway_batch_id" });

    if (upsertError) {
      throw new Error(upsertError.message);
    }

    summary.batchesUpserted += 1;
  }

  return summary;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseAnonKey || !supabaseKey) {
      return jsonResponse({ success: false, error: "Supabase environment is not configured." }, 500);
    }

    const body = await req.json().catch(() => ({} as JsonRecord));
    const authResult = await authenticateAdmin(req, supabaseUrl, supabaseAnonKey, supabaseKey);
    if (authResult.error) {
      return jsonResponse({ success: false, error: authResult.error }, 401);
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const requestedIds = Array.isArray(body?.transactionIds)
      ? body.transactionIds.map((value: unknown) => String(value || "").trim()).filter(Boolean)
      : [];
    const limit = Math.min(Math.max(Number(body?.limit || 100), 1), 500);
    const daysBack = Math.min(Math.max(Number(body?.daysBack || 14), 1), 31);

    const { data: paymentSettingsData, error: settingsError } = await supabase
      .from("payment_settings")
      .select("*")
      .eq("provider", "authorize_net")
      .eq("profile_id", authResult.admin!.id)
      .maybeSingle();

    if (settingsError || !paymentSettingsData) {
      return jsonResponse({ success: false, error: "Payment gateway not configured for this admin account." }, 400);
    }

    const settings = paymentSettingsData.settings as Record<string, unknown> | null;
    const apiLoginId = String(settings?.apiLoginId || "").trim();
    const transactionKey = String(settings?.transactionKey || "").trim();
    const isTestMode = settings?.testMode === true;

    if (!(settings?.enabled === true)) {
      return jsonResponse({ success: false, error: "Payment gateway is disabled." }, 400);
    }

    if (!apiLoginId || !transactionKey) {
      return jsonResponse({ success: false, error: "Payment gateway credentials are missing." }, 400);
    }

    const endpoint = isTestMode ? AUTHORIZE_NET_SANDBOX : AUTHORIZE_NET_PRODUCTION;
    const batchSummary = await syncGatewayBatches({
      supabase,
      endpoint,
      apiLoginId,
      transactionKey,
      adminId: authResult.admin!.id,
      daysBack,
    });

    let query = supabase
      .from("payment_transactions")
      .select("id, transaction_id, status, amount, transaction_type, gateway_batch_id")
      .not("transaction_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (requestedIds.length > 0) {
      query = query.in("id", requestedIds);
    }

    const { data: transactions, error: transactionError } = await query;
    if (transactionError) {
      return jsonResponse({ success: false, error: transactionError.message }, 500);
    }

    const rows = (transactions || []) as PaymentTransactionRow[];
    const summary = {
      checked: 0,
      matched: 0,
      mismatched: 0,
      notFound: 0,
      errored: 0,
      ...batchSummary,
    };
    const results: Array<Record<string, unknown>> = [];
    const checkedAt = new Date().toISOString();

    for (const row of rows) {
      if (!row.transaction_id) {
        continue;
      }

      summary.checked += 1;

      let updatePayload: Record<string, unknown> = {
        reconciliation_last_checked_at: checkedAt,
      };

      try {
        const gatewayResponse = await getTransactionDetails(
          endpoint,
          apiLoginId,
          transactionKey,
          row.transaction_id,
        );

        const parsed = gatewayResponse.parsed;
        const responseRoot = parsed?.transactionDetailsResponse || parsed?.getTransactionDetailsResponse || parsed;
        const resultCode = responseRoot?.messages?.resultCode;
        const transaction = responseRoot?.transaction;
        const gatewayStatus = normalizeGatewayStatus(transaction?.transactionStatus);
        const settlementTimeUtc = transaction?.settlementTimeUTC || null;
        const batchId = normalizeText(transaction?.batch?.batchId) || null;

        if (!gatewayResponse.ok || resultCode !== "Ok" || !transaction) {
          const gatewayMessage =
            responseRoot?.messages?.message?.[0]?.text ||
            responseRoot?.messages?.message?.text ||
            "Transaction details not available from Authorize.Net";

          updatePayload = {
            ...updatePayload,
            reconciliation_status: "not_found",
            reconciliation_reason: gatewayMessage,
            gateway_response: parsed,
          };

          summary.notFound += 1;
          results.push({
            id: row.id,
            transactionId: row.transaction_id,
            reconciliationStatus: "not_found",
            message: gatewayMessage,
          });
        } else {
          const matched = statusesMatch(row.status, gatewayStatus);
          const reconciliationStatus = matched ? "matched" : "mismatch";
          const reason = matched
            ? `Local status ${row.status || "unknown"} matches gateway status ${gatewayStatus || "unknown"}.`
            : `Local status ${row.status || "unknown"} does not match gateway status ${gatewayStatus || "unknown"}.`;

          updatePayload = {
            ...updatePayload,
            gateway_transaction_status: gatewayStatus || null,
            gateway_batch_id: batchId,
            gateway_settlement_time: settlementTimeUtc,
            reconciliation_status: reconciliationStatus,
            reconciliation_reason: reason,
            gateway_response: parsed,
          };

          if (matched) {
            summary.matched += 1;
          } else {
            summary.mismatched += 1;
          }

          results.push({
            id: row.id,
            transactionId: row.transaction_id,
            reconciliationStatus,
            localStatus: row.status,
            gatewayStatus,
            settlementTimeUtc,
            batchId,
          });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unexpected reconciliation error";
        updatePayload = {
          ...updatePayload,
          reconciliation_status: "error",
          reconciliation_reason: message,
        };
        summary.errored += 1;
        results.push({
          id: row.id,
          transactionId: row.transaction_id,
          reconciliationStatus: "error",
          message,
        });
      }

      const { error: updateError } = await supabase
        .from("payment_transactions")
        .update(updatePayload)
        .eq("id", row.id);

      if (updateError) {
        summary.errored += 1;
        results.push({
          id: row.id,
          transactionId: row.transaction_id,
          reconciliationStatus: "error",
          message: updateError.message,
        });
      }
    }

    return jsonResponse({
      success: true,
      requestedBy: authResult.admin,
      checkedAt,
      summary,
      results,
    });
  } catch (error) {
    console.error("reconcile-authorize-transactions error:", error);
    return jsonResponse(
      { success: false, error: error instanceof Error ? error.message : "Internal server error" },
      500,
    );
  }
});
