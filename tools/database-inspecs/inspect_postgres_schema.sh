#!/usr/bin/env bash
# Extract full column/attribute info for every table in a Postgres database.
#
# Usage:
#   ./inspect_postgres_schema.sh <container_name> <db_user> <db_name> [output_file]
#
# Example:
#   ./inspect_postgres_schema.sh ultimate-tckt-production-ctd-db-1 postgres ctd_db schema_dump.csv
#
# Will prompt for the DB password interactively.

set -euo pipefail

CONTAINER="${1:?Usage: $0 <container_name> <db_user> <db_name> [output_file]}"
DB_USER="${2:?Missing db_user}"
DB_NAME="${3:?Missing db_name}"
OUT_FILE="${4:-schema_dump_$(date +%Y%m%d_%H%M%S).csv}"

echo "Extracting schema for database '$DB_NAME' from container '$CONTAINER'..."
read -rs -p "Postgres password for '$DB_USER': " DB_PASS
echo

docker exec -i -e PGPASSWORD="$DB_PASS" "$CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -A -F $'\t' -t -c "
SELECT
    c.table_name,
    c.ordinal_position,
    c.column_name,
    c.data_type ||
        CASE WHEN c.character_maximum_length IS NOT NULL
             THEN '(' || c.character_maximum_length || ')'
             ELSE '' END AS full_type,
    c.is_nullable,
    COALESCE(
        (SELECT 'PK' FROM information_schema.key_column_usage kcu
         JOIN information_schema.table_constraints tc
           ON kcu.constraint_name = tc.constraint_name
         WHERE tc.constraint_type = 'PRIMARY KEY'
           AND kcu.table_name = c.table_name
           AND kcu.column_name = c.column_name
         LIMIT 1),
        ''
    ) AS key_type,
    COALESCE(c.column_default, ''),
    COALESCE(pgd.description, '')
FROM information_schema.columns c
LEFT JOIN pg_catalog.pg_statio_all_tables st
    ON st.relname = c.table_name
LEFT JOIN pg_catalog.pg_description pgd
    ON pgd.objoid = st.relid AND pgd.objsubid = c.ordinal_position
WHERE c.table_schema = 'public'
ORDER BY c.table_name, c.ordinal_position;
" > /tmp/_raw_schema.tsv

{
    echo "table_name,ordinal_position,column_name,data_type,is_nullable,key_type,column_default,column_comment"
    awk -F'\t' 'NF>1 {
        for (i=1; i<=NF; i++) {
            gsub(/^ +| +$/, "", $i)
            gsub(/"/, "\"\"", $i)
            printf "\"%s\"%s", $i, (i<NF ? "," : "\n")
        }
    }' /tmp/_raw_schema.tsv
} > "$OUT_FILE"

rm -f /tmp/_raw_schema.tsv

echo "Done. Wrote $(($(wc -l < "$OUT_FILE") - 1)) column rows to: $OUT_FILE"
