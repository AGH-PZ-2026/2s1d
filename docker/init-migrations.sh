#!/bin/bash
# Auto-apply all Drizzle migrations on MySQL init
set -e

echo "Applying Drizzle migrations..."
for f in /migrations/*.sql; do
  echo "  Running: $(basename "$f")"
  sed '/^-->/d' "$f" | mysql -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE"
done
echo "Migrations complete."
