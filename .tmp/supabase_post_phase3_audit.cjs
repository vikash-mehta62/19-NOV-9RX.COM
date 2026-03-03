const fs = require('fs');
const path = require('path');

function readEnv(filePath) {
  const env = {};
  const raw = fs.readFileSync(filePath, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    if (!line || line.trim().startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx <= 0) continue;
    const k = line.slice(0, idx).trim();
    const v = line.slice(idx + 1).trim();
    env[k] = v;
  }
  return env;
}

async function fetchJson(url, headers) {
  const res = await fetch(url, { headers });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}
  return { status: res.status, json, text };
}

function parseOpenApiPaths(openapi) {
  const paths = openapi?.paths || {};
  const tablePaths = [];
  const rpcPaths = [];

  for (const p of Object.keys(paths)) {
    if (p.startsWith('/rpc/')) {
      const fn = p.replace('/rpc/', '');
      rpcPaths.push({ path: p, function: fn, methods: Object.keys(paths[p] || {}) });
      continue;
    }

    // table/view endpoints are typically '/table_name'
    const name = p.replace(/^\//, '');
    if (!name || name.includes('/')) continue;
    tablePaths.push({ path: p, table: name, methods: Object.keys(paths[p] || {}) });
  }

  return { tablePaths, rpcPaths };
}

async function testAnonTableAccess(baseUrl, anonKey, tables) {
  const headers = { apikey: anonKey, Authorization: `Bearer ${anonKey}` };
  const results = [];

  for (const t of tables) {
    const url = `${baseUrl}/rest/v1/${encodeURIComponent(t)}?select=*&limit=1`;
    const { status, json, text } = await fetchJson(url, headers);
    const rowCount = Array.isArray(json) ? json.length : null;
    let errorCode = null;
    let message = null;
    if (json && !Array.isArray(json)) {
      errorCode = json.code || null;
      message = json.message || null;
    }

    results.push({ table: t, status, row_count: rowCount, error_code: errorCode, message });
  }

  return results;
}

(async () => {
  const rootEnv = readEnv(path.join(process.cwd(), '.env'));
  const serverEnv = readEnv(path.join(process.cwd(), 'server/.env'));

  const url = rootEnv.VITE_SUPABASE_URL || serverEnv.SUPABASE_URL;
  const anon = rootEnv.VITE_SUPABASE_ANON_KEY || serverEnv.SUPABASE_ANON_KEY;
  const service = serverEnv.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !anon || !service) {
    throw new Error('Missing Supabase URL/keys in .env files');
  }

  const anonHeaders = { apikey: anon, Authorization: `Bearer ${anon}` };
  const srvHeaders = { apikey: service, Authorization: `Bearer ${service}` };

  const anonOpenApi = await fetchJson(`${url}/rest/v1/`, anonHeaders);
  const srvOpenApi = await fetchJson(`${url}/rest/v1/`, srvHeaders);

  const anonParsed = parseOpenApiPaths(anonOpenApi.json || {});
  const srvParsed = parseOpenApiPaths(srvOpenApi.json || {});

  const anonTables = anonParsed.tablePaths.map(x => x.table).sort();
  const srvTables = srvParsed.tablePaths.map(x => x.table).sort();
  const anonFunctions = anonParsed.rpcPaths.map(x => x.function).sort();
  const srvFunctions = srvParsed.rpcPaths.map(x => x.function).sort();

  const anonTableAccess = await testAnonTableAccess(url, anon, anonTables);

  const tablesWithRows = anonTableAccess.filter(r => r.status === 200 && (r.row_count || 0) > 0).map(r => r.table).sort();
  const tablesDenied = anonTableAccess.filter(r => r.status !== 200).map(r => ({ table: r.table, status: r.status, code: r.error_code }));

  const report = {
    timestamp: new Date().toISOString(),
    project_url: url,
    openapi: {
      anon_status: anonOpenApi.status,
      service_status: srvOpenApi.status,
      anon_tables_count: anonTables.length,
      anon_functions_count: anonFunctions.length,
      service_tables_count: srvTables.length,
      service_functions_count: srvFunctions.length,
      anon_tables: anonTables,
      anon_functions: anonFunctions,
    },
    runtime_anon: {
      tested_tables_count: anonTableAccess.length,
      accessible_200_count: anonTableAccess.filter(r => r.status === 200).length,
      denied_count: tablesDenied.length,
      tables_with_rows_count: tablesWithRows.length,
      tables_with_rows: tablesWithRows,
      denied_samples: tablesDenied.slice(0, 30),
      full_results: anonTableAccess,
    },
  };

  fs.mkdirSync(path.join(process.cwd(), '.tmp'), { recursive: true });
  fs.writeFileSync(path.join(process.cwd(), '.tmp', 'supabase_post_phase3_audit.json'), JSON.stringify(report, null, 2));

  const summary = [
    `ANON_OPENAPI_TABLES=${anonTables.length}`,
    `ANON_OPENAPI_RPCS=${anonFunctions.length}`,
    `ANON_RUNTIME_200=${report.runtime_anon.accessible_200_count}`,
    `ANON_RUNTIME_WITH_ROWS=${report.runtime_anon.tables_with_rows_count}`,
    `ANON_RUNTIME_DENIED=${report.runtime_anon.denied_count}`,
    `ANON_TABLES_WITH_ROWS=${tablesWithRows.join(',')}`,
    `ANON_RPC_LIST=${anonFunctions.join(',')}`,
  ].join('\n');

  fs.writeFileSync(path.join(process.cwd(), '.tmp', 'supabase_post_phase3_audit_summary.txt'), summary);
  console.log(summary);
})();
