#!/usr/bin/env bash
# Extract full column/attribute info for every table in a MySQL database.
#
# Usage:
#   ./inspect_mysql_schema.sh <container_name> <db_user> <db_name> [output_file]
#
# Example:
#   ./inspect_mysql_schema.sh ultimate-tckt-production-core-db-1 tckt_app ultimate_tckt schema_dump.csv
#
# Will prompt for the DB password interactively.

set -euo pipefail

CONTAINER="${1:?Usage: $0 <container_name> <db_user> <db_name> [output_file]}"
DB_USER="${2:?Missing db_user}"
DB_NAME="${3:?Missing db_name}"
OUT_FILE="${4:-schema_dump_$(date +%Y%m%d_%H%M%S).csv}"

echo "Extracting schema for database '$DB_NAME' from container '$CONTAINER'..."
read -rs -p "MySQL password for '$DB_USER': " DB_PASS
echo

docker exec -i "$CONTAINER" mysql -u "$DB_USER" -p"$DB_PASS" -N -B -e "
SELECT
    c.TABLE_NAME,
    c.ORDINAL_POSITION,
    c.COLUMN_NAME,
    c.COLUMN_TYPE,
    c.IS_NULLABLE,
    c.COLUMN_KEY,
    IFNULL(c.COLUMN_DEFAULT, ''),
    c.EXTRA,
    IFNULL(c.COLUMN_COMMENT, '')
FROM information_schema.columns c
WHERE c.TABLE_SCHEMA = '${DB_NAME}'
ORDER BY c.TABLE_NAME, c.ORDINAL_POSITION;
" > /tmp/_raw_schema.tsv

{
    echo "table_name,ordinal_position,column_name,column_type,is_nullable,column_key,column_default,extra,column_comment"
    awk -F'\t' '{
        for (i=1; i<=NF; i++) {
            gsub(/"/, "\"\"", $i)
            printf "\"%s\"%s", $i, (i<NF ? "," : "\n")
        }
    }' /tmp/_raw_schema.tsv
} > "$OUT_FILE"

rm -f /tmp/_raw_schema.tsv

echo "Done. Wrote $(($(wc -l < "$OUT_FILE") - 1)) column rows to: $OUT_FILE"
