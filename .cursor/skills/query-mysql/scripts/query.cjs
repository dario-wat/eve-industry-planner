#!/usr/bin/env node
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const DEFAULT_LIMIT = 100;
const READONLY_USERNAME = 'eip_query_readonly';
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);
const SECRET_COLUMNS = new Set([
  'accesstoken',
  'refreshtoken',
  'session_secret',
]);
const BANNED_SQL =
  /\b(INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|CREATE|REPLACE|GRANT|REVOKE|LOAD|CALL|LOCK|UNLOCK|RENAME|SET|PREPARE|EXECUTE|DEALLOCATE|INTO\s+OUTFILE|INTO\s+DUMPFILE|FOR\s+UPDATE)\b/i;
const READ_START = /^(SELECT|SHOW|DESCRIBE|DESC|EXPLAIN|WITH)\b/i;

function fail(message, code = 1) {
  console.error(message);
  process.exit(code);
}

function findRepoRoot(startDir) {
  let dir = startDir;
  while (true) {
    const envPath = path.join(dir, '.env');
    const serverDir = path.join(dir, 'server');
    if (fs.existsSync(envPath) && fs.existsSync(serverDir)) {
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
    json: true,
    limit: DEFAULT_LIMIT,
    tables: false,
    describe: null,
    sql: null,
    file: null,
    setupReadonly: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    switch (arg) {
      case '--write':
        fail(
          'This tool is SELECT-only. There is no write mode; DELETE/DROP/UPDATE cannot be enabled.',
        );
        break;
      case '--include-secrets':
        args.includeSecrets = true;
        break;
      case '--allow-remote':
        args.allowRemote = true;
        break;
      case '--json':
        args.json = true;
        break;
      case '--table':
        args.json = false;
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
      case '--limit': {
        const raw = argv[++i];
        const n = Number(raw);
        if (!Number.isInteger(n) || n < 0) fail(`Invalid --limit: ${raw}`);
        args.limit = n;
        break;
      }
      case '--sql':
        args.sql = argv.slice(i + 1).join(' ').trim();
        i = argv.length;
        break;
      case '--file':
        args.file = argv[++i];
        if (!args.file) fail('Missing path after --file');
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

Usage:
  node query.cjs --setup-readonly
  node query.cjs --tables
  node query.cjs --describe types
  node query.cjs --sql "SELECT id, name FROM types WHERE name LIKE '%Tritanium%' LIMIT 20"
  node query.cjs --file query.sql

Queries always use DATABASE_READONLY_* (SELECT privilege only).
The app's DATABASE_USERNAME is never used for queries.

Flags:
  --setup-readonly     Create the SELECT-only MySQL user and write .env keys
  --tables             List tables
  --describe TABLE     Show columns for one table
  --sql SQL            Run SQL (everything after this flag)
  --file PATH          Run SQL from a file
  --limit N            Max rows printed (default ${DEFAULT_LIMIT}; 0 = no cap)
  --json               JSON output (default)
  --table              TSV output
  --include-secrets    Do not redact accessToken / refreshToken
  --allow-remote       Allow a non-localhost DATABASE_HOST
`);
}

function stripSqlComments(sql) {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/^\s*--.*$/gm, ' ')
    .replace(/^\s*#.*$/gm, ' ')
    .trim();
}

function assertSafeSql(sql) {
  const stripped = stripSqlComments(sql);
  if (!stripped) fail('Empty SQL');
  if (stripped.includes(';') && stripped.replace(/;\s*$/, '').includes(';')) {
    fail('Multiple SQL statements are not allowed');
  }

  const first = stripped.split(/\s+/)[0];
  if (!READ_START.test(first)) {
    fail(`Refusing '${first}'. This tool is SELECT-only.`);
  }
  if (BANNED_SQL.test(stripped)) {
    fail('Refusing SQL that looks like a write. This tool is SELECT-only.');
  }
}

function redactRows(rows) {
  return rows.map((row) => {
    const out = {};
    for (const [key, value] of Object.entries(row)) {
      if (SECRET_COLUMNS.has(key.toLowerCase())) {
        out[key] = value == null ? value : '[redacted]';
      } else {
        out[key] = value;
      }
    }
    return out;
  });
}

function printRows(rows, { json, truncated, extra }) {
  const payload = {
    rowCount: rows.length,
    truncated,
    ...extra,
    rows,
  };
  if (json) {
    console.log(JSON.stringify(payload, null, 2));
    return;
  }
  if (extra && extra.meta) {
    console.error(extra.meta);
  }
  if (rows.length === 0) {
    console.log('(0 rows)');
    return;
  }
  const cols = Object.keys(rows[0]);
  console.log(cols.join('\t'));
  for (const row of rows) {
    console.log(cols.map((col) => stringifyCell(row[col])).join('\t'));
  }
  if (truncated) {
    console.error(`truncated to ${rows.length} rows`);
  }
}

function stringifyCell(value) {
  if (value == null) return '';
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function identifier(name) {
  if (!/^[A-Za-z0-9_]+$/.test(name)) {
    fail(`Invalid table name: ${name}`);
  }
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

function readAdminDb(allowRemote) {
  const host = process.env.DATABASE_HOST;
  const port = Number(process.env.DATABASE_PORT);
  const user = process.env.DATABASE_USERNAME;
  const database = process.env.DATABASE_NAME;
  const password = process.env.DATABASE_PASSWORD;

  if (!host || !user || !database || !port) {
    fail('Missing DATABASE_HOST / DATABASE_PORT / DATABASE_USERNAME / DATABASE_NAME in .env');
  }

  const isLocal = LOCAL_HOSTS.has(host);
  if (!isLocal && !allowRemote) {
    fail(
      `DATABASE_HOST is '${host}', not localhost. Pass --allow-remote if you intend to query that host.`,
    );
  }

  return { host, port, user, database, password, isLocal };
}

function readReadonlyDb(admin) {
  const user = process.env.DATABASE_READONLY_USERNAME;
  const password = process.env.DATABASE_READONLY_PASSWORD;
  if (!user || !password) {
    fail(
      'Missing DATABASE_READONLY_USERNAME / DATABASE_READONLY_PASSWORD in .env. Run:\n  node .cursor/skills/query-mysql/scripts/query.cjs --setup-readonly',
    );
  }
  if (user === admin.user) {
    fail('DATABASE_READONLY_USERNAME must not be the app DATABASE_USERNAME.');
  }
  if (user.toLowerCase() === 'root') {
    fail('Refusing to query as root.');
  }
  return {
    host: admin.host,
    port: admin.port,
    database: admin.database,
    user,
    password,
    isLocal: admin.isLocal,
  };
}

function grantText(row) {
  return String(Object.values(row)[0] || '');
}

function assertSelectOnlyGrants(grants) {
  if (!grants.length) {
    fail('Could not read MySQL grants; refusing to query.');
  }
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

function lockConnectionReadOnly(connection) {
  const rawQuery = connection.query.bind(connection);
  connection.query = (sql, ...rest) => {
    if (typeof sql === 'string') {
      assertSafeSql(sql);
    } else {
      fail('Refusing non-string SQL.');
    }
    return rawQuery(sql, ...rest);
  };
  connection.execute = () => {
    fail('Prepared statements are disabled.');
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
    text += `\n# Read-only MySQL user for .cursor/skills/query-mysql (SELECT only)\n${missing.join('\n')}\n`;
  }
  fs.writeFileSync(envPath, text);
}

async function connectReadOnly(mysql, cfg) {
  const connection = await mysql.createConnection({
    host: cfg.host,
    port: cfg.port,
    user: cfg.user,
    password: cfg.password,
    database: cfg.database,
    multipleStatements: false,
  });
  const rawQuery = connection.query.bind(connection);
  await rawQuery('SET SESSION TRANSACTION READ ONLY');
  const [grants] = await rawQuery('SHOW GRANTS');
  assertSelectOnlyGrants(grants);
  lockConnectionReadOnly(connection);
  return connection;
}

async function setupReadonly(mysql, admin, envPath) {
  const username = process.env.DATABASE_READONLY_USERNAME || READONLY_USERNAME;
  const password =
    process.env.DATABASE_READONLY_PASSWORD ||
    crypto.randomBytes(24).toString('base64url');
  const mysqlHosts = [...new Set([admin.host, 'localhost', '127.0.0.1'])].filter(
    (h) => LOCAL_HOSTS.has(h) || h === admin.host,
  );

  const adminConn = await mysql.createConnection({
    host: admin.host,
    port: admin.port,
    user: admin.user,
    password: admin.password,
    multipleStatements: false,
  });

  try {
    for (const mysqlHost of mysqlHosts) {
      const account = quotedUser(username, mysqlHost);
      await adminConn.query(
        `CREATE USER IF NOT EXISTS ${account} IDENTIFIED BY ${adminConn.escape(password)}`,
      );
      await adminConn.query(
        `ALTER USER ${account} IDENTIFIED BY ${adminConn.escape(password)}`,
      );
      try {
        await adminConn.query(`REVOKE ALL PRIVILEGES, GRANT OPTION FROM ${account}`);
      } catch (err) {
        if (!/there is no such grant|doesn't exist/i.test(err.message)) {
          throw err;
        }
      }
      await adminConn.query(
        `GRANT SELECT ON ${identifier(admin.database)}.* TO ${account}`,
      );
    }
    await adminConn.query('FLUSH PRIVILEGES');
  } finally {
    await adminConn.end();
  }

  upsertEnvKeys(envPath, {
    DATABASE_READONLY_USERNAME: username,
    DATABASE_READONLY_PASSWORD: password,
  });

  const readonlyCfg = {
    ...admin,
    user: username,
    password,
  };
  const probe = await connectReadOnly(mysql, readonlyCfg);
  try {
    const [grants] = await probe.query('SHOW GRANTS');
    console.log(
      JSON.stringify(
        {
          created: true,
          username,
          host: admin.host,
          database: admin.database,
          envKeys: ['DATABASE_READONLY_USERNAME', 'DATABASE_READONLY_PASSWORD'],
          grants,
        },
        null,
        2,
      ),
    );
  } finally {
    await probe.end();
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const repoRoot = findRepoRoot(__dirname);
  const envPath = path.join(repoRoot, '.env');
  const { dotenv, mysql } = loadMysql(repoRoot);
  dotenv.config({ path: envPath });

  const admin = readAdminDb(args.allowRemote);

  if (args.setupReadonly) {
    await setupReadonly(mysql, admin, envPath);
    return;
  }

  let sql = args.sql;
  if (args.file) {
    sql = fs.readFileSync(path.resolve(args.file), 'utf8');
  }
  if (args.tables) {
    sql = 'SHOW TABLES';
  } else if (args.describe) {
    sql = `DESCRIBE ${identifier(args.describe)}`;
  }

  if (!sql) fail('No SQL. Use --tables, --describe TABLE, --sql, or --file.');
  assertSafeSql(sql);

  const readonly = readReadonlyDb(admin);
  const connection = await connectReadOnly(mysql, readonly);
  try {
    const [result] = await connection.query(sql);
    const rows = Array.isArray(result)
      ? result
      : [{ affectedRows: result.affectedRows, info: result.info }];
    const truncated = args.limit > 0 && rows.length > args.limit;
    const sliced = truncated ? rows.slice(0, args.limit) : rows;
    const safe = args.includeSecrets ? sliced : redactRows(sliced);
    printRows(safe, {
      json: args.json,
      truncated,
      extra: {
        meta: {
          host: readonly.host,
          database: readonly.database,
          user: readonly.user,
          local: readonly.isLocal,
          readonly: true,
        },
      },
    });
  } finally {
    await connection.end();
  }
}

main().catch((err) => {
  fail(err.message);
});
