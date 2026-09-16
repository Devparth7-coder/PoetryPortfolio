#!/bin/sh
set -e
# Apply pending migrations and create the first admin (idempotent) before serving.
npx tsx scripts/migrate.ts
if [ -n "$ADMIN_EMAIL" ] && [ -n "$ADMIN_PASSWORD" ]; then npx tsx scripts/seed.ts || echo "seed skipped"; fi
exec "$@"
