# Creates a second MySQL user, MYSQL_READONLY_USER, with SELECT-only access to MYSQL_DATABASE.
# This is the DATABASE_READONLY_* login that .claude/skills/query-mysql uses for ad-hoc queries.
# The mysql image creates root and MYSQL_USER itself but has no option for a read-only user.
#
# docker-compose.yml mounts ./initdb at /docker-entrypoint-initdb.d. The image's entrypoint
# sources every *.sh file there once, on first start, when the data dir is still empty. It does
# not run again on later starts. To add the user to an existing database, run the two SQL
# statements below by hand as root.
# Do not use `exit` or `set -e` here: this file is sourced, not executed.
# Passwords must not contain single quotes.

if [ -n "${MYSQL_READONLY_USER:-}" ] && [ -n "${MYSQL_READONLY_PASSWORD:-}" ]; then
  MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql --protocol=socket \
    --socket="${SOCKET:-/var/run/mysqld/mysqld.sock}" -uroot <<SQL
CREATE USER IF NOT EXISTS '${MYSQL_READONLY_USER}'@'%' IDENTIFIED BY '${MYSQL_READONLY_PASSWORD}';
GRANT SELECT ON \`${MYSQL_DATABASE}\`.* TO '${MYSQL_READONLY_USER}'@'%';
SQL
  echo "Created read-only user ${MYSQL_READONLY_USER}"
else
  echo "MYSQL_READONLY_USER/PASSWORD not set; skipping read-only user"
fi
