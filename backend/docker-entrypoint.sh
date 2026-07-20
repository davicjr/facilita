#!/bin/sh
set -e

mkdir -p /app/uploads/images /app/uploads/documents /app/backups/auto /app/backups/tmp /app/exports
chown -R node:node /app/uploads /app/backups /app/exports

exec gosu node "$@"
