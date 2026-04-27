#!/usr/bin/env bash
set -euo pipefail

BASE_DIR="$(cd "$(dirname "$0")" && pwd)"
SERVER_DIR="$BASE_DIR/mt5server"
TARGET_API_DIR="$BASE_DIR/mt5api"
LOCAL_VERSION_FILE="$BASE_DIR/version.json"
DEFAULT_RELEASE_BASE_URL="https://github.com/codejarrown/release"
TMP_DIR=""

command_exists() {
  command -v "$1" >/dev/null 2>&1
}

require_path() {
  local path="$1"
  if [ ! -e "$path" ]; then
    echo "[ERROR] Missing required path: $path"
    exit 1
  fi
}

cleanup_port_listeners() {
  local port="$1"
  local pids
  pids="$(lsof -tiTCP:"$port" -sTCP:LISTEN || true)"
  if [ -n "$pids" ]; then
    echo "==> Releasing port $port: $pids"
    echo "$pids" | xargs -r kill -TERM || true
    sleep 1
    pids="$(lsof -tiTCP:"$port" -sTCP:LISTEN || true)"
    if [ -n "$pids" ]; then
      echo "$pids" | xargs -r kill -KILL || true
    fi
  fi
}

copy_file_if_exists() {
  local source="$1"
  local target="$2"
  if [ -f "$source" ]; then
    cp -f "$source" "$target"
  fi
}

cleanup_tmp() {
  if [ -n "$TMP_DIR" ] && [ -d "$TMP_DIR" ]; then
    rm -rf "$TMP_DIR"
  fi
}
trap cleanup_tmp EXIT

extract_json_value() {
  local file="$1"
  local key="$2"
  sed -n "s/.*\"$key\"[[:space:]]*:[[:space:]]*\"\([^\"]*\)\".*/\1/p" "$file" | head -n 1
}

download_file() {
  local url="$1"
  local output="$2"
  if command_exists curl; then
    curl -fsSL "$url" -o "$output"
    return
  fi
  if command_exists wget; then
    wget -qO "$output" "$url"
    return
  fi
  echo "[ERROR] curl or wget is required to download updates."
  exit 1
}

ensure_extract_tool() {
  if command_exists unzip; then
    return
  fi
  echo "[ERROR] unzip is required for remote update."
  exit 1
}

resolve_release_base_url() {
  if [ -f "$LOCAL_VERSION_FILE" ]; then
    local embedded
    embedded="$(extract_json_value "$LOCAL_VERSION_FILE" "releaseBaseUrl")"
    if [ -n "$embedded" ]; then
      printf '%s\n' "$embedded"
      return
    fi
  fi
  printf '%s\n' "${RELEASE_BASE_URL:-$DEFAULT_RELEASE_BASE_URL}"
}

apply_remote_bundle() {
  local source_dir="$1"
  local source_server_dir="$source_dir/mt5server"
  local source_api_dir="$source_dir/mt5api"
  local package_lock_changed=0

  if [ "$source_dir" = "$BASE_DIR" ]; then
    echo "[ERROR] Update source cannot be the current install directory."
    exit 1
  fi

  if ! command_exists rsync; then
    echo "[ERROR] rsync is required for update.sh"
    exit 1
  fi

  require_path "$source_dir"
  require_path "$source_server_dir/dist/main.cjs"
  require_path "$source_server_dir/public/index.html"
  require_path "$source_server_dir/package.json"
  require_path "$source_api_dir"

  if [ -f "$source_server_dir/package-lock.json" ]; then
    if [ ! -f "$SERVER_DIR/package-lock.json" ] || ! cmp -s "$source_server_dir/package-lock.json" "$SERVER_DIR/package-lock.json"; then
      package_lock_changed=1
    fi
  fi

  echo "==> Stopping running services"
  cleanup_port_listeners 3000
  cleanup_port_listeners 5050

  echo "==> Updating mt5api"
  mkdir -p "$TARGET_API_DIR"
  rsync -a --delete "$source_api_dir/" "$TARGET_API_DIR/"

  echo "==> Updating mt5server/dist"
  mkdir -p "$SERVER_DIR/dist"
  rsync -a --delete "$source_server_dir/dist/" "$SERVER_DIR/dist/"

  echo "==> Updating mt5server/public"
  mkdir -p "$SERVER_DIR/public"
  rsync -a --delete "$source_server_dir/public/" "$SERVER_DIR/public/"

  echo "==> Updating mt5server package metadata"
  copy_file_if_exists "$source_server_dir/package.json" "$SERVER_DIR/package.json"
  copy_file_if_exists "$source_server_dir/package-lock.json" "$SERVER_DIR/package-lock.json"

  echo "==> Updating launcher scripts"
  copy_file_if_exists "$source_dir/start.sh" "$BASE_DIR/start.sh"
  copy_file_if_exists "$source_dir/start.bat" "$BASE_DIR/start.bat"
  copy_file_if_exists "$source_dir/update.sh" "$BASE_DIR/update.sh"
  copy_file_if_exists "$source_dir/update.bat" "$BASE_DIR/update.bat"
  copy_file_if_exists "$source_dir/_run_mt5api.cmd" "$BASE_DIR/_run_mt5api.cmd"
  copy_file_if_exists "$source_dir/_run_mt5server.cmd" "$BASE_DIR/_run_mt5server.cmd"
  copy_file_if_exists "$source_dir/version.json" "$BASE_DIR/version.json"
  chmod +x "$BASE_DIR/start.sh" "$BASE_DIR/update.sh" 2>/dev/null || true

  if [ "$package_lock_changed" -eq 1 ]; then
    echo "==> package-lock.json changed; reinstalling production dependencies"
    (
      cd "$SERVER_DIR"
      rm -rf node_modules
      npm ci --no-fund --no-audit --omit=dev
    )
  else
    echo "==> package-lock.json unchanged; keeping existing node_modules"
  fi

  echo "==> Update complete"
  echo "Run: cd \"$BASE_DIR\" && ./start.sh"
}

update_from_remote() {
  local release_base_url latest_url latest_file remote_version local_version bundle_url zip_file extracted_dir
  release_base_url="$(resolve_release_base_url)"
  latest_url="${release_base_url%/}/releases/latest/download/latest.json"
  TMP_DIR="$(mktemp -d)"
  latest_file="$TMP_DIR/latest.json"

  echo "==> Checking latest release"
  download_file "$latest_url" "$latest_file"

  remote_version="$(extract_json_value "$latest_file" "version")"
  bundle_url="$(extract_json_value "$latest_file" "bundleUrl")"
  local_version=""
  if [ -f "$LOCAL_VERSION_FILE" ]; then
    local_version="$(extract_json_value "$LOCAL_VERSION_FILE" "version")"
  fi

  if [ -n "$local_version" ] && [ "$local_version" = "$remote_version" ]; then
    echo "==> Already up to date: $local_version"
    exit 0
  fi

  if [ -z "$bundle_url" ]; then
    echo "[ERROR] latest.json is missing bundleUrl"
    exit 1
  fi

  ensure_extract_tool
  zip_file="$TMP_DIR/one-click.zip"
  echo "==> Downloading release bundle"
  download_file "$bundle_url" "$zip_file"

  echo "==> Extracting release bundle"
  unzip -q "$zip_file" -d "$TMP_DIR"
  extracted_dir="$TMP_DIR/one-click"
  require_path "$extracted_dir"

  if [ -n "$remote_version" ]; then
    echo "==> Updating to version $remote_version"
  fi
  apply_remote_bundle "$extracted_dir"
}

update_from_remote
