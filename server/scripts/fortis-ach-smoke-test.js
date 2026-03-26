#!/usr/bin/env node

const axios = require("axios");
const dotenv = require("dotenv");
const path = require("path");
const {
  buildFortisHeaders,
  describeFortisStatus,
  hasRequiredFortisConfig,
  isSandboxLikeFortisUrl,
  normalizeFortisAccountType,
  resolveFortisConfig,
} = require("../utils/fortis");

dotenv.config({ path: path.resolve(__dirname, "../.env") });

function readArg(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

async function main() {
  const config = resolveFortisConfig();
  const dryRun = process.argv.includes("--dry-run");
  const pollOnlyTransactionId = readArg("--transaction-id");
  const createTransaction = process.argv.includes("--create");

  if (!hasRequiredFortisConfig(config)) {
    throw new Error("Missing Fortis configuration. Required: FORTIS_DEVELOPER_ID, FORTIS_USER_ID, FORTIS_USER_API_KEY, FORTIS_LOCATION_ID, FORTIS_PRODUCT_TRANSACTION_ID_ACH.");
  }

  if (!isSandboxLikeFortisUrl(config.apiUrl) && process.env.FORTIS_SMOKE_ALLOW_NON_SANDBOX !== "true") {
    throw new Error("Refusing to run against a non-sandbox Fortis URL. Set FORTIS_SMOKE_ALLOW_NON_SANDBOX=true only if you intend to override this safeguard.");
  }

  if (dryRun) {
    console.log(JSON.stringify({
      success: true,
      mode: "dry-run",
      apiUrl: config.apiUrl,
      sandboxLike: isSandboxLikeFortisUrl(config.apiUrl),
    }, null, 2));
    return;
  }

  if (pollOnlyTransactionId) {
    const response = await axios.get(`${config.apiUrl}/transactions/${pollOnlyTransactionId}`, {
      headers: buildFortisHeaders(config),
    });
    const transaction = response.data?.transaction || response.data;
    console.log(JSON.stringify({
      success: true,
      mode: "lookup",
      transactionId: transaction?.id,
      statusId: transaction?.status_id || null,
      gatewayStatus: describeFortisStatus(transaction),
      rawResponse: transaction,
    }, null, 2));
    return;
  }

  if (!createTransaction) {
    throw new Error("Choose one mode: --dry-run, --transaction-id <id>, or --create.");
  }

  const amount = Number(process.env.FORTIS_SMOKE_AMOUNT || 1.11).toFixed(2);
  const accountNumber = process.env.FORTIS_SMOKE_ACCOUNT_NUMBER;
  const routingNumber = process.env.FORTIS_SMOKE_ROUTING_NUMBER;
  const accountHolderName = process.env.FORTIS_SMOKE_ACCOUNT_HOLDER_NAME;
  const accountType = normalizeFortisAccountType(process.env.FORTIS_SMOKE_ACCOUNT_TYPE);

  if (!accountNumber || !routingNumber || !accountHolderName) {
    throw new Error("Missing sandbox ACH test account values. Required: FORTIS_SMOKE_ACCOUNT_NUMBER, FORTIS_SMOKE_ROUTING_NUMBER, FORTIS_SMOKE_ACCOUNT_HOLDER_NAME.");
  }

  const payload = {
    transaction: {
      action: "debit",
      payment_method: "ach",
      location_id: config.locationId,
      product_transaction_id: config.productTransactionIdAch,
      account_holder_name: accountHolderName,
      account_number: accountNumber,
      account_type: accountType,
      routing: routingNumber,
      ach_sec_code: process.env.FORTIS_SMOKE_SEC_CODE || "WEB",
      transaction_amount: amount,
      description: process.env.FORTIS_SMOKE_DESCRIPTION || "Sandbox ACH smoke test",
      billing_street: process.env.FORTIS_SMOKE_BILLING_STREET || "123 Sandbox St",
      billing_city: process.env.FORTIS_SMOKE_BILLING_CITY || "Testville",
      billing_state: process.env.FORTIS_SMOKE_BILLING_STATE || "NY",
      billing_zip: process.env.FORTIS_SMOKE_BILLING_ZIP || "10001",
      order_num: `fortis-smoke-${Date.now()}`,
      effective_date: new Date().toISOString().split("T")[0],
    },
  };

  const createResponse = await axios.post(`${config.apiUrl}/transactions`, payload, {
    headers: buildFortisHeaders(config),
  });
  const transaction = createResponse.data?.transaction || createResponse.data;

  console.log(JSON.stringify({
    success: true,
    mode: "create",
    transactionId: transaction?.id,
    statusId: transaction?.status_id || null,
    gatewayStatus: describeFortisStatus(transaction),
    rawResponse: transaction,
    note: "ACH returns are delayed; use --transaction-id <id> later to inspect post-origination status.",
  }, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({
    success: false,
    error: error instanceof Error ? error.message : "Fortis smoke test failed",
  }, null, 2));
  process.exit(1);
});
