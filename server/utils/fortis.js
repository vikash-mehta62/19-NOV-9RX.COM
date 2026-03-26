function normalizeFortisAccountType(accountType) {
  return String(accountType || "").toLowerCase() === "savings" ? "savings" : "checking";
}

function resolveFortisConfig(settings = {}) {
  const explicitApiUrl = settings.apiUrl;
  const sandboxApiUrl = process.env.FORTIS_SANDBOX_API_URL || process.env.VITE_FORTIS_SANDBOX_API_URL;
  const productionApiUrl = process.env.FORTIS_PRODUCTION_API_URL || process.env.VITE_FORTIS_PRODUCTION_API_URL;
  const defaultApiUrl = process.env.FORTIS_API_URL || process.env.VITE_FORTIS_API_URL || "https://api.fortispay.com/v2";
  const testMode = settings.testMode === true;

  return {
    apiUrl:
      explicitApiUrl ||
      (testMode ? sandboxApiUrl : productionApiUrl) ||
      defaultApiUrl,
    developerId: settings.developerId || process.env.FORTIS_DEVELOPER_ID || process.env.VITE_FORTIS_DEVELOPER_ID,
    userId: settings.userId || process.env.FORTIS_USER_ID || process.env.VITE_FORTIS_USER_ID,
    userApiKey: settings.userApiKey || process.env.FORTIS_USER_API_KEY || process.env.VITE_FORTIS_USER_API_KEY,
    locationId: settings.locationId || process.env.FORTIS_LOCATION_ID || process.env.VITE_FORTIS_LOCATION_ID,
    productTransactionIdAch:
      settings.productTransactionIdAch ||
      process.env.FORTIS_PRODUCT_TRANSACTION_ID_ACH ||
      process.env.VITE_FORTIS_PRODUCT_TRANSACTION_ID_ACH,
    testMode,
  };
}

function hasRequiredFortisConfig(config) {
  return Boolean(
    config?.apiUrl &&
      config?.developerId &&
      config?.userId &&
      config?.userApiKey &&
      config?.locationId &&
      config?.productTransactionIdAch
  );
}

function buildFortisHeaders(config) {
  return {
    "Content-Type": "application/json",
    "developer-id": config.developerId,
    "user-id": config.userId,
    "user-api-key": config.userApiKey,
  };
}

function extractFortisSettlementTime(transaction = {}) {
  return (
    transaction.settlement_time ||
    transaction.settled_at ||
    transaction.settlement_at ||
    transaction.transaction_settlement_date ||
    null
  );
}

function extractFortisBatchId(transaction = {}) {
  return transaction.batch_id || transaction.batch || transaction.batch_number || null;
}

function describeFortisStatus(transaction = {}) {
  return (
    transaction.status ||
    transaction.status_name ||
    transaction.verbiage ||
    transaction.response_message ||
    (transaction.status_id ? `status_${transaction.status_id}` : "unknown")
  );
}

function deriveFortisLocalStatus(transaction = {}) {
  const statusId = Number(transaction.status_id);
  const summary = `${transaction.verbiage || ""} ${transaction.response_message || ""} ${transaction.status || ""} ${transaction.status_name || ""}`.toLowerCase();

  if (summary.includes("return")) {
    return "error";
  }

  if (statusId === 134 || summary.includes("settled") || summary.includes("approved")) {
    return "approved";
  }

  if ([131, 132, 133].includes(statusId) || summary.includes("originat") || summary.includes("pending")) {
    return "pending";
  }

  if (statusId === 301 || summary.includes("declin") || summary.includes("reject")) {
    return "declined";
  }

  return "error";
}

function deriveFortisReconciliationStatus(transaction = {}) {
  const localStatus = deriveFortisLocalStatus(transaction);
  if (localStatus === "error") {
    return "error";
  }
  return "matched";
}

function isSandboxLikeFortisUrl(apiUrl) {
  return /sandbox|test|cert/i.test(String(apiUrl || ""));
}

module.exports = {
  buildFortisHeaders,
  describeFortisStatus,
  deriveFortisLocalStatus,
  deriveFortisReconciliationStatus,
  extractFortisBatchId,
  extractFortisSettlementTime,
  hasRequiredFortisConfig,
  isSandboxLikeFortisUrl,
  normalizeFortisAccountType,
  resolveFortisConfig,
};
