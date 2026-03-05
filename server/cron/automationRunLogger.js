const { createClient } = require("@supabase/supabase-js");

const DEFAULT_POLL_MS = 5000;
const LOG_PREFIX = "[AutomationCron]";

let pollTimer = null;
let lastSeenCreatedAt = null;
const printedIds = new Set();

function asInt(value, fallback) {
  const parsed = Number.parseInt(String(value || ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function sourceLabel(source) {
  if (source === "manual") return "manual";
  if (source === "cron" || source === "pg_cron") return "scheduled";
  return source || "unknown";
}

function triggerLabel(triggerType) {
  const map = {
    cron_cycle: "cron_cycle",
    auto_reorder: "auto_reorder",
    low_stock: "low_stock",
    high_value_order: "high_value_order",
    order_status: "order_status",
  };
  return map[triggerType] || triggerType || "unknown";
}

function cleanupPrintedIds(maxSize = 1000) {
  if (printedIds.size <= maxSize) return;
  const overflow = printedIds.size - maxSize;
  let removed = 0;
  for (const id of printedIds) {
    printedIds.delete(id);
    removed += 1;
    if (removed >= overflow) break;
  }
}

function formatRunSummary(log) {
  const source = sourceLabel(log?.trigger_data?.source);
  const trigger = triggerLabel(log?.trigger_type);
  const status = String(log?.status || "unknown").toUpperCase();
  const at = log?.created_at || log?.executed_at || new Date().toISOString();
  const ruleName = log?.automation_rules?.name || null;
  const activeRuleNames = Array.isArray(log?.trigger_data?.active_rule_names)
    ? log.trigger_data.active_rule_names
    : [];

  const details = [
    `status=${status}`,
    `trigger=${trigger}`,
    `source=${source}`,
    `time=${at}`,
  ];

  if (ruleName) {
    details.push(`rule="${ruleName}"`);
  }

  if (activeRuleNames.length > 0) {
    details.push(`active_rules=${activeRuleNames.join(", ")}`);
  }

  if (log?.action_taken) {
    details.push(`action="${log.action_taken}"`);
  }

  if (log?.error_message) {
    details.push(`error="${log.error_message}"`);
  }

  return `${LOG_PREFIX} ${details.join(" | ")}`;
}

async function fetchLatestCursor(supabase) {
  const { data, error } = await supabase
    .from("automation_logs")
    .select("id, created_at")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (data?.id) {
    printedIds.add(data.id);
  }
  lastSeenCreatedAt = data?.created_at || null;
}

async function logCronStatus(supabase) {
  try {
    const { data, error } = await supabase.rpc("is_automation_cron_active");
    if (error) {
      console.warn(`${LOG_PREFIX} unable to read cron status: ${error.message}`);
      return;
    }
    console.log(`${LOG_PREFIX} watcher started | cron_active=${Boolean(data)}`);
  } catch (err) {
    console.warn(`${LOG_PREFIX} cron status check failed: ${err.message}`);
  }
}

async function pollNewLogs(supabase) {
  let query = supabase
    .from("automation_logs")
    .select("id, trigger_type, trigger_data, action_taken, status, error_message, created_at, executed_at, automation_rules(name)")
    .order("created_at", { ascending: true })
    .limit(100);

  if (lastSeenCreatedAt) {
    query = query.gt("created_at", lastSeenCreatedAt);
  }

  const { data, error } = await query;
  if (error) {
    throw error;
  }

  if (!Array.isArray(data) || data.length === 0) {
    return;
  }

  for (const log of data) {
    if (!log?.id || printedIds.has(log.id)) {
      continue;
    }

    printedIds.add(log.id);
    console.log(formatRunSummary(log));
  }

  cleanupPrintedIds();
  lastSeenCreatedAt = data[data.length - 1]?.created_at || lastSeenCreatedAt;
}

function startAutomationRunLogger() {
  const enabled = String(process.env.AUTOMATION_TERMINAL_LOGS || "true").toLowerCase() !== "false";
  if (!enabled) {
    return;
  }

  if (pollTimer) {
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.warn(`${LOG_PREFIX} disabled: missing SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY`);
    return;
  }

  const pollMs = asInt(process.env.AUTOMATION_LOG_POLL_MS, DEFAULT_POLL_MS);
  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  (async () => {
    try {
      await fetchLatestCursor(supabase);
      await logCronStatus(supabase);
    } catch (err) {
      console.warn(`${LOG_PREFIX} init failed: ${err.message}`);
    }
  })();

  pollTimer = setInterval(async () => {
    try {
      await pollNewLogs(supabase);
    } catch (err) {
      console.warn(`${LOG_PREFIX} poll error: ${err.message}`);
    }
  }, pollMs);
}

module.exports = {
  startAutomationRunLogger,
};
