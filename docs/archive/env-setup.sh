#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

ENV_PATH="$SCRIPT_DIR/.env"
ENV_CHANGED=0

command_exists() {
  command -v "$1" >/dev/null 2>&1
}

random_hex() {
  local bytes="$1"
  if command_exists openssl; then
    openssl rand -hex "$bytes"
    return
  fi
  if command_exists python3; then
    python3 - "$bytes" <<'PY'
import os, sys
print(os.urandom(int(sys.argv[1])).hex())
PY
    return
  fi
  if command_exists python; then
    python - "$bytes" <<'PY'
import os, sys
print(os.urandom(int(sys.argv[1])).encode("hex"))
PY
    return
  fi
  dd if=/dev/urandom bs=1 count="$bytes" 2>/dev/null | od -An -tx1 | tr -d ' \n'
}

random_urlsafe() {
  local bytes="$1"
  if command_exists openssl; then
    openssl rand -base64 "$bytes" | tr -d '\n' | tr '+/' '-_' | tr -d '='
    return
  fi
  if command_exists python3; then
    python3 - "$bytes" <<'PY'
import base64, os, sys
data = os.urandom(int(sys.argv[1]))
print(base64.urlsafe_b64encode(data).decode("ascii").rstrip("="))
PY
    return
  fi
  if command_exists python; then
    python - "$bytes" <<'PY'
import base64, os, sys
data = os.urandom(int(sys.argv[1]))
print(base64.urlsafe_b64encode(data).decode("ascii").rstrip("="))
PY
    return
  fi
  dd if=/dev/urandom bs=1 count="$bytes" 2>/dev/null | base64 | tr -d '\n' | tr '+/' '-_' | tr -d '='
}

read_kv() {
  ENV_CUR=""
  if [ -f "$ENV_PATH" ]; then
    local line
    line="$(grep -m1 -E "^$1=" "$ENV_PATH" 2>/dev/null || true)"
    if [ -n "$line" ]; then
      ENV_CUR="${line#*=}"
    fi
  fi
}

set_env() {
  local key="$1"
  local value="$2"
  local tmp="${ENV_PATH}.tmp"
  awk -v key="$key" -v value="$value" '
    BEGIN { found=0 }
    {
      if ($0 ~ "^" key "=") {
        if (!found) { print key "=" value; found=1 }
        next
      }
      print $0
    }
    END {
      if (!found) { print key "=" value }
    }
  ' "$ENV_PATH" > "$tmp" && mv "$tmp" "$ENV_PATH"
  ENV_CHANGED=1
  echo "Atualizado: ${key}=${value}"
}

ensure_kv() {
  read_kv "$1"
  if [ -z "$ENV_CUR" ]; then
    set_env "$1" "$2"
  fi
}

ensure_kv_if_empty() {
  read_kv "$1"
  if [ -z "$ENV_CUR" ]; then
    set_env "$1" "$2"
  fi
}

ensure_kv_if_insecure() {
  local key="$1"
  local insecure="$2"
  local bytes="$3"
  read_kv "$key"
  if [ -z "$ENV_CUR" ] || [ "$ENV_CUR" = "$insecure" ]; then
    set_env "$key" "$(random_hex "$bytes")"
  fi
}

ensure_admin_password() {
  read_kv "SUPERADMIN_PASSWORD"
  if [ -z "$ENV_CUR" ] || [ "$ENV_CUR" = "ChangeMe123!" ]; then
    set_env "SUPERADMIN_PASSWORD" "$(random_urlsafe 24)A1"
  fi
}

ensure_env_secure() {
  if [ ! -f "$ENV_PATH" ]; then
    if [ -f ".env.production" ]; then
      cp ".env.production" "$ENV_PATH"
    elif [ -f ".env.example" ]; then
      cp ".env.example" "$ENV_PATH"
    else
      : > "$ENV_PATH"
    fi
  fi

  if [ -f ".gitignore" ]; then
    if ! grep -qx ".env" ".gitignore"; then
      echo ".env" >> ".gitignore"
    fi
  fi

  ensure_kv "POSTGRES_USER" "postgres"
  ensure_kv "POSTGRES_DB" "facilita_v2"

  ensure_kv_if_insecure "POSTGRES_PASSWORD" "postgres" 24
  ensure_kv_if_insecure "JWT_ACCESS_SECRET" "facilita-jwt-access-secret-change-me" 32
  ensure_kv_if_insecure "JWT_ACCESS_SECRET" "your-super-secret-access-key-change-me-in-production" 32
  ensure_kv_if_insecure "JWT_REFRESH_SECRET" "facilita-jwt-refresh-secret-change-me" 32
  ensure_kv_if_insecure "JWT_REFRESH_SECRET" "your-super-secret-refresh-key-change-me-in-production" 32

  ensure_kv "JWT_ACCESS_EXPIRES_IN" "15m"
  ensure_kv "JWT_REFRESH_EXPIRES_IN" "7d"

  ensure_kv "SUPERADMIN_EMAIL" "superadmin@facilita.local"
  ensure_kv "SUPERADMIN_NAME" "Super Admin"
  ensure_admin_password

  ensure_kv_if_empty "CORS_ORIGIN" "http://localhost:80"
  ensure_kv "COOKIE_SECURE" "false"
  ensure_kv "COOKIE_DOMAIN" ""
  ensure_kv "NEXT_PUBLIC_API_URL" "/api"
  ensure_kv "NGINX_PORT" "80"
}

ensure_env_secure

if [ "$ENV_CHANGED" -eq 0 ]; then
  echo "Nenhuma alteracao necessaria."
fi

echo
echo ".env ready at $ENV_PATH"
echo
