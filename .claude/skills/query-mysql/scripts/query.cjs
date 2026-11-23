#!/usr/bin/env node
'use strict';

// Read-only query tool for the EVE Industry Planner MySQL database.
// Safety layers, strongest first:
//   1. Connects as DATABASE_READONLY_* and aborts unless SHOW GRANTS is SELECT-only.
//   2. SET SESSION TRANSACTION READ ONLY.
//   3. Static SQL check: one statement, starts with a read keyword, no write keywords
//      (string literals, quoted identifiers and comments are ignored by the check).

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const SCRIPT_REL = '.claude/skills/query-mysql/scripts/query.cjs';
const DEFAULT_LIMIT = 100;
const DEFAULT_TIMEOUT_SEC = 30;
const READONLY_USERNAME = 'eip_query_readonly';
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);
const SECRET_COLUMNS = new Set(['accesstoken', 'refreshtoken', 'session_secret']);
const SECRET_MENTION = /\b(accesstoken|refreshtoken|sessions)\b/i;
// REPLACE( and INSERT( are string functions, so only the statement forms are banned.
const BANNED_SQL = new RegExp(
  '\\b(INSERT(?!\\s*\\()|UPDATE|DELETE|DROP|ALTER|TRUNCATE|CREATE|REPLACE(?!\\s*\\()|GRANT|' +
    'REVOKE|LOAD|CALL|LOCK|UNLOCK|RENAME|SET|PREPARE|EXECUTE|DEALLOCATE|HANDLER|' +
    'INTO\\s+OUTFILE|INTO\\s+DUMPFILE|FOR\\s+UPDATE|FOR\\s+SHARE)\\b',
  'i',
);
const READ_START = /^(SELECT|SHOW|DESCRIBE|DESC|EXPLAIN|WITH)\b/i;
const LIMITABLE_START = /^(SELECT|WITH)\b/i;
const TRAILING_LIMIT = /\bLIMIT\s+\d+(\s*,\s*\d+|\s+OFFSET\s+\d+)?\s*$/i;
// Strings, quoted identifiers, and comments, in one pass so a quote inside a comment
// (or a comment marker inside a string) is handled correctly.
const SQL_TOKEN =
  /'(?:[^'\\]|\\[\s\S]|'')*'|"(?:[^"\\]|\\[\s\S]|"")*"|`(?:[^`]|``)*`|\/\*[\s\S]*?\*\/|--(?=\s|$)[^\n]*|#[^\n]*/g;

function fail(message, code = 1) {
  console.error(message);
  process.exit(code);
}

function findRepoRoot(startDir) {
  let dir = startDir;
  while (true) {
    if (fs.existsSync(path.join(dir, '.env')) && fs.existsSync(path.join(dir, 'server'))) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      fail('Could not find repo root (expected .env next to server/).');
    }
    dir = parent;
  }
}

function parseArgs(argv) {
  const args = {
    includeSecrets: false,
    allowRemote: false,
    format: 'json',
    limit: DEFAULT_LIMIT,
    timeoutSec: DEFAULT_TIMEOUT_SEC,
    tables: false,
    describe: null,
    sql: null,
    file: null,
    stdin: false,
    setupReadonly: false,
  };

  const intArg = (flag, raw, min) => {
    const n = Number(raw);
    if (!Number.isInteger(n) || n < min) fail(`Invalid ${flag}: ${raw}`);
    return n;
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    switch (arg) {
      case '--write':
        fail('This tool is SELECT-only. There is no write mode.');
        break;
      case '--include-secrets':
        args.includeSecrets = true;
        break;
      case '--allow-remote':
        args.allowRemote = true;
        break;
      case '--json':
        args.format = 'json';
        break;
      case '--objects':
        args.format = 'objects';
        break;
      case '--table':
      case '--tsv':
        args.format = 'tsv';
        break;
      case '--tables':
        args.tables = true;
        break;
      case '--setup-readonly':
        args.setupReadonly = true;
        break;
      case '--describe':
        args.describe = argv[++i];
        if (!args.describe) fail('Missing table name after --describe');
        break;
      case '--limit':
        args.limit = intArg(arg, argv[++i], 0);
        break;
      case '--timeout':
        args.timeoutSec = intArg(arg, argv[++i], 1);
        break;
      case '--stdin':
        args.stdin = true;
        break;
      case '--file':
        args.file = argv[++i];
        if (!args.file) fail('Missing path after --file');
        break;
      case '--sql':
        args.sql = argv.slice(i + 1).join(' ').trim();
        i = argv.length;
        break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
        break;
      default:
        if (arg.startsWith('-')) fail(`Unknown flag: ${arg}`);
        args.sql = argv.slice(i).join(' ').trim();
        i = argv.length;
    }
  }

  return args;
}

function printHelp() {
  console.log(`Query the EVE Industry Planner MySQL database (SELECT-only).

Usage (from the repo root):
  node ${SCRIPT_REL} --tables
  node ${SCRIPT_REL} --describe sde_types
  node ${SCRIPT_REL} --sql "SELECT typeId, name FROM sde_types LIMIT 20"
  node ${SCRIPT_REL} --stdin <<'SQL'
  SELECT name FROM sde_types WHERE name LIKE '%Tritanium%'
  SQL

Flags:
  --tables             Tables with approximate row counts and size
  --describe TABLE     Columns, indexes, foreign keys (both directions), approx rows
  --sql SQL            Run SQL (everything after this flag)
  --stdin              Read SQL from stdin (use with a quoted heredoc to avoid shell quoting)
  --file PATH          Read SQL from a file
  --limit N            Max rows returned (default ${DEFAULT_LIMIT}; 0 = no cap). Applied in SQL
                       for SELECT/WITH queries that don't end in their own LIMIT.
  --timeout SEC        Server-side query time limit (default ${DEFAULT_TIMEOUT_SEC})
  --json               Compact JSON: columns once, one row array per line (default)
  --objects            JSON array of row objects
  --tsv, --table       Tab-separated output
  --include-secrets    Do not redact tokens / session data
  --allow-remote       Allow a public (non-LAN) DATABASE_HOST
  --setup-readonly     Create the SELECT-only user on a local MySQL and write .env keys
`);
}

// ---------------------------------------------------------------------------
// SQL checks

/** Returns { exec, masked }: exec is runnable SQL without comments or trailing ';',
 * masked additionally has string literals and quoted identifiers blanked out. */
function prepareSql(sql) {
  const isComment = (m) => m.startsWith('/*') || m.startsWith('--') || m.startsWith('#');
  const noComments = sql.replace(SQL_TOKEN, (m) => (isComment(m) ? ' ' : m)).trim();
  const masked = noComments
    .replace(SQL_TOKEN, (m) => (m[0] === '`' ? '`x`' : `${m[0]}${m[0]}`))
    .replace(/;\s*$/, '')
    .trim();
  const exec = noComments.replace(/;\s*$/, '').trim();
  return { exec, masked };
}

function assertSafeSql(sql) {
  const { exec, masked } = prepareSql(sql);
  if (!masked) fail('Empty SQL');
  if (masked.includes(';')) fail('Multiple SQL statements are not allowed');
  const first = masked.split(/[\s(]+/)[0];
  if (!READ_START.test(first)) fail(`Refusing '${first}'. This tool is SELECT-only.`);
  const banned = masked.match(BANNED_SQL);
  if (banned) fail(`Refusing SQL containing '${banned[0]}'. This tool is SELECT-only.`);
  return { exec, masked };
}

function applyLimit(exec, masked, limit) {
  if (limit <= 0 || !LIMITABLE_START.test(masked) || TRAILING_LIMIT.test(masked)) {
    return exec;
  }
  // +1 so we can tell whether the result was cut off.
  return `${exec}\nLIMIT ${limit + 1}`;
}

// ---------------------------------------------------------------------------
// Output

function normalizeCell(value) {
  if (value == null) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString();
  if (Buffer.isBuffer(value)) {
    const hex = value.subarray(0, 64).toString('hex');
    return `0x${hex}${value.length > 64 ? `…(${value.length} bytes)` : ''}`;
  }
  if (typeof value === 'bigint') return value.toString();
  return value;
}

function isSecretField(field, mentionsSecret) {
  const name = String(field.name || '').toLowerCase();
  const orgName = String(field.orgName || '').toLowerCase();
  const orgTable = String(field.orgTable || '').toLowerCase();
  if (SECRET_COLUMNS.has(name) || SECRET_COLUMNS.has(orgName)) return true;
  if (orgTable === 'sessions' && orgName === 'data') return true;
  // Computed column (CONCAT(accessToken), etc.) in a query that touches secrets.
  return mentionsSecret && !orgName;
}

/** Top-level keys one per line; arrays get one element per line. Valid JSON. */
function formatCompactJson(obj) {
  const parts = Object.entries(obj).map(([key, value]) => {
    if (Array.isArray(value) && value.some((v) => v !== null && typeof v === 'object')) {
      return `${JSON.stringify(key)}:[\n${value.map((v) => JSON.stringify(v)).join(',\n')}\n]`;
    }
    return `${JSON.stringify(key)}:${JSON.stringify(value)}`;
  });
  return `{${parts.join(',\n')}}`;
}

function printResult(result, format) {
  const { columns, rows } = result;
  if (format === 'tsv') {
    console.log(columns.join('\t'));
    for (const row of rows) {
      console.log(
        row
          .map((v) => (v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v)))
          .join('\t'),
      );
    }
    if (result.truncated) console.error(`truncated to ${rows.length} rows`);
    return;
  }
  if (format === 'objects') {
    const objects = rows.map((row) => Object.fromEntries(columns.map((c, i) => [c, row[i]])));
    console.log(JSON.stringify({ ...result, columns: undefined, rows: objects }, null, 2));
    return;
  }
  console.log(formatCompactJson(result));
}

// ---------------------------------------------------------------------------
// Connection

function identifier(name) {
  if (!/^[A-Za-z0-9_]+$/.test(name)) fail(`Invalid table name: ${name}`);
  return `\`${name}\``;
}

function loadMysql(repoRoot) {
  const serverModules = path.join(repoRoot, 'server', 'node_modules');
  try {
    return {
      dotenv: require(path.join(serverModules, 'dotenv')),
      mysql: require(path.join(serverModules, 'mysql2/promise')),
    };
  } catch (err) {
    fail(`Need server deps. Run npm i --prefix server\n${err.message}`);
  }
}

function hostKind(host) {
  if (LOCAL_HOSTS.has(host)) return 'local';
  if (
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
    /\.(local|lan|home\.arpa)$/i.test(host) ||
    /^[a-z0-9-]+$/i.test(host)
  ) {
    return 'lan';
  }
  return 'remote';
}

function readAdminDb(allowRemote) {
  const host = process.env.DATABASE_HOST;
  const port = Number(process.env.DATABASE_PORT);
  const user = process.env.DATABASE_USERNAME;
  const database = process.env.DATABASE_NAME;
  const password = process.env.DATABASE_PASSWORD;

  if (!host || !user || !database || !port) {
    fail('Missing DATABASE_HOST / DATABASE_PORT / DATABASE_USERNAME / DATABASE_NAME in .env');
  }
  const kind = hostKind(host);
  if (kind === 'remote' && !allowRemote) {
    fail(
      `DATABASE_HOST '${host}' is not a local or LAN address. ` +
        'Pass --allow-remote if you intend to query it.',
    );
  }
  return { host, port, user, database, password, kind };
}

function readReadonlyDb(admin) {
  const user = process.env.DATABASE_READONLY_USERNAME;
  const password = process.env.DATABASE_READONLY_PASSWORD;
  if (!user || !password) {
    fail(
      'Missing DATABASE_READONLY_USERNAME / DATABASE_READONLY_PASSWORD in .env. ' +
        `For a local MySQL run: node ${SCRIPT_REL} --setup-readonly. ` +
        'For the Pi, see deploy/pi/initdb/10-readonly-user.sh.',
    );
  }
  if (user === admin.user) fail('DATABASE_READONLY_USERNAME must not be the app DATABASE_USERNAME.');
  if (user.toLowerCase() === 'root') fail('Refusing to query as root.');
  return { ...admin, user, password };
}

function grantText(row) {
  return String(Object.values(row)[0] || '');
}

function assertSelectOnlyGrants(grants) {
  if (!grants.length) fail('Could not read MySQL grants; refusing to query.');
  for (const row of grants) {
    const text = grantText(row);
    if (/^GRANT USAGE ON/i.test(text)) continue;
    if (/\bWITH GRANT OPTION\b/i.test(text)) {
      fail(`Query user has GRANT OPTION. Refusing to run.\n${text}`);
    }
    if (!/^GRANT SELECT\b/i.test(text)) {
      fail(`Query user is not SELECT-only. Refusing to run.\n${text}`);
    }
    const rest = text.replace(/^GRANT SELECT\b/i, '');
    if (
      /\b(ALL|INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE|INDEX|REFERENCES|TRIGGER|EXECUTE|FILE|SUPER|RELOAD|SHUTDOWN|PROCESS|EVENT|REPLICA|REPLICATION)\b/i.test(
        rest,
      )
    ) {
      fail(`Query user has write privileges. Refusing to run.\n${text}`);
    }
  }
}

function sslOptions() {
  if (process.env.DATABASE_SSL !== '1') return undefined;
  return { minVersion: 'TLSv1.2', rejectUnauthorized: true };
}

/** Opens the read-only connection and returns a guarded `run(sql, values)`. */
async function connectReadOnly(mysql, cfg, timeoutSec) {
  const connection = await mysql.createConnection({
    host: cfg.host,
    port: cfg.port,
    user: cfg.user,
    password: cfg.password,
    database: cfg.database,
    ssl: sslOptions(),
    multipleStatements: false,
    connectTimeout: 10000,
    // Return DATE/DATETIME as stored, without local-timezone conversion.
    dateStrings: true,
  });
  const rawQuery = connection.query.bind(connection);
  try {
    await rawQuery('SET SESSION TRANSACTION READ ONLY');
  } catch (err) {
    if (!/READ ONLY has only noop implementation in tidb/i.test(err.message || '')) throw err;
  }
  try {
    await rawQuery(`SET SESSION max_execution_time = ${timeoutSec * 1000}`);
  } catch {
    // Not supported everywhere; the client-side timeout below still applies.
  }
  const [grants] = await rawQuery('SHOW GRANTS');
  assertSelectOnlyGrants(grants);

  connection.query = () => fail('Use run(); raw queries are disabled.');
  connection.execute = () => fail('Prepared statements are disabled.');

  const run = (sql, values) => {
    assertSafeSql(sql);
    return rawQuery({ sql, values, rowsAsArray: true, timeout: (timeoutSec + 5) * 1000 });
  };
  return { connection, run };
}

// ---------------------------------------------------------------------------
// Commands

async function runQuery(run, sql, args) {
  const { exec, masked } = assertSafeSql(sql);
  const started = Date.now();
  const [result, fields] = await run(applyLimit(exec, masked, args.limit));
  const ms = Date.now() - started;

  if (!Array.isArray(result)) {
    return { columns: ['affectedRows'], rows: [[result.affectedRows]], rowCount: 1, ms };
  }
  const columns = (fields || []).map((f) => f.name);
  const mentionsSecret = SECRET_MENTION.test(masked);
  const secret = (fields || []).map(
    (f) => !args.includeSecrets && isSecretField(f, mentionsSecret),
  );
  const truncated = args.limit > 0 && result.length > args.limit;
  const rows = (truncated ? result.slice(0, args.limit) : result).map((row) =>
    row.map((v, i) => (secret[i] && v != null ? '[redacted]' : normalizeCell(v))),
  );
  return { columns, rowCount: rows.length, truncated, ms, rows };
}

async function listTables(run) {
  const [rows] = await run(
    `SELECT TABLE_NAME, TABLE_ROWS, ROUND((DATA_LENGTH + INDEX_LENGTH) / 1048576, 1)
     FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE()
     ORDER BY TABLE_NAME`,
  );
  return {
    note: 'approxRows/mb come from information_schema statistics and can be stale',
    columns: ['table', 'approxRows', 'mb'],
    rows: rows.map((r) => r.map(normalizeCell)),
  };
}

async function describeTable(run, table) {
  identifier(table);
  const [[info]] = await run(
    `SELECT TABLE_ROWS, ROUND((DATA_LENGTH + INDEX_LENGTH) / 1048576, 1)
     FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    [table],
  );
  if (!info) {
    fail(`No table '${table}'. Names are case-sensitive on the Pi; run --tables.`);
  }
  const [columns] = await run(
    `SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_KEY, COLUMN_DEFAULT, EXTRA
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
     ORDER BY ORDINAL_POSITION`,
    [table],
  );
  const [indexes] = await run(
    `SELECT INDEX_NAME, NON_UNIQUE = 0, GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX)
     FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
     GROUP BY INDEX_NAME, NON_UNIQUE
     ORDER BY INDEX_NAME = 'PRIMARY' DESC, INDEX_NAME`,
    [table],
  );
  const [foreignKeys] = await run(
    `SELECT COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
     FROM information_schema.KEY_COLUMN_USAGE
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND REFERENCED_TABLE_NAME IS NOT NULL`,
    [table],
  );
  const [referencedBy] = await run(
    `SELECT TABLE_NAME, COLUMN_NAME, REFERENCED_COLUMN_NAME
     FROM information_schema.KEY_COLUMN_USAGE
     WHERE TABLE_SCHEMA = DATABASE() AND REFERENCED_TABLE_NAME = ?`,
    [table],
  );
  return {
    table,
    approxRows: normalizeCell(info[0]),
    mb: normalizeCell(info[1]),
    columnFields: ['name', 'type', 'nullable', 'key', 'default', 'extra'],
    columns: columns.map((r) => r.map(normalizeCell)),
    indexes: indexes.map(([name, unique, cols]) => ({ name, unique: !!unique, columns: cols })),
    foreignKeys: foreignKeys.map(([column, refTable, refColumn]) => ({
      column,
      references: `${refTable}.${refColumn}`,
    })),
    referencedBy: referencedBy.map(([t, column, refColumn]) => ({
      from: `${t}.${column}`,
      column: refColumn,
    })),
  };
}

function quotedUser(username, host) {
  return `'${username.replace(/'/g, "''")}'@'${host.replace(/'/g, "''")}'`;
}

function upsertEnvKeys(envPath, entries) {
  let text = fs.readFileSync(envPath, 'utf8');
  const missing = [];
  for (const [key, value] of Object.entries(entries)) {
    const re = new RegExp(`^${key}=.*$`, 'm');
    if (re.test(text)) {
      text = text.replace(re, `${key}=${value}`);
    } else {
      missing.push(`${key}=${value}`);
    }
  }
  if (missing.length) {
    if (!text.endsWith('\n')) text += '\n';
    text += `\n# Read-only MySQL user for .claude/skills/query-mysql (SELECT only)\n${missing.join('\n')}\n`;
  }
  fs.writeFileSync(envPath, text);
}

async function setupReadonly(mysql, admin, envPath, timeoutSec) {
  if (admin.kind !== 'local') {
    fail(
      `--setup-readonly only manages a local MySQL. DATABASE_HOST is '${admin.host}'; ` +
        'create the user on that server (see deploy/pi/initdb/10-readonly-user.sh).',
    );
  }
  const username = process.env.DATABASE_READONLY_USERNAME || READONLY_USERNAME;
  const password =
    process.env.DATABASE_READONLY_PASSWORD || crypto.randomBytes(24).toString('base64url');

  const adminConn = await mysql.createConnection({
    host: admin.host,
    port: admin.port,
    user: admin.user,
    password: admin.password,
    multipleStatements: false,
  });
  try {
    for (const mysqlHost of ['localhost', '127.0.0.1']) {
      const account = quotedUser(username, mysqlHost);
      const pw = adminConn.escape(password);
      await adminConn.query(`CREATE USER IF NOT EXISTS ${account} IDENTIFIED BY ${pw}`);
      await adminConn.query(`ALTER USER ${account} IDENTIFIED BY ${pw}`);
      try {
        await adminConn.query(`REVOKE ALL PRIVILEGES, GRANT OPTION FROM ${account}`);
      } catch (err) {
        if (!/there is no such grant|doesn't exist/i.test(err.message)) throw err;
      }
      await adminConn.query(`GRANT SELECT ON ${identifier(admin.database)}.* TO ${account}`);
    }
    await adminConn.query('FLUSH PRIVILEGES');
  } finally {
    await adminConn.end();
  }

  upsertEnvKeys(envPath, {
    DATABASE_READONLY_USERNAME: username,
    DATABASE_READONLY_PASSWORD: password,
  });

  const { connection } = await connectReadOnly(
    mysql,
    { ...admin, user: username, password },
    timeoutSec,
  );
  await connection.end();
  console.log(
    JSON.stringify({ created: true, username, host: admin.host, database: admin.database }),
  );
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const repoRoot = findRepoRoot(__dirname);
  const envPath = path.join(repoRoot, '.env');
  const { dotenv, mysql } = loadMysql(repoRoot);
  dotenv.config({ path: envPath, quiet: true });

  const admin = readAdminDb(args.allowRemote);
  if (args.setupReadonly) {
    await setupReadonly(mysql, admin, envPath, args.timeoutSec);
    return;
  }

  let sql = args.sql;
  if (args.file) sql = fs.readFileSync(path.resolve(args.file), 'utf8');
  if (args.stdin) sql = fs.readFileSync(0, 'utf8');
  if (!sql && !args.tables && !args.describe) {
    fail('No SQL. Use --tables, --describe TABLE, --sql, --stdin, or --file.');
  }
  if (sql) assertSafeSql(sql);

  const cfg = readReadonlyDb(admin);
  const { connection, run } = await connectReadOnly(mysql, cfg, args.timeoutSec);
  try {
    let result;
    if (args.tables) {
      result = await listTables(run);
    } else if (args.describe) {
      result = await describeTable(run, args.describe);
    } else {
      result = await runQuery(run, sql, args);
    }
    result = { db: `${cfg.user}@${cfg.host}/${cfg.database}`, ...result };
    if (args.describe) {
      console.log(formatCompactJson(result));
    } else {
      printResult(result, args.format);
    }
  } finally {
    await connection.end();
  }
}

main().catch((err) => {
  const message = err.message || String(err);
  if (/maximum statement execution time|query inactivity timeout/i.test(message)) {
    fail(`Query timed out: ${message}\nNarrow it, add an indexed filter, or raise --timeout.`);
  }
  fail(message);
});
