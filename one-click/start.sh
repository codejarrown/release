#!/usr/bin/env bash
set -euo pipefail

BASE_DIR="$(cd "$(dirname "$0")" && pwd)"
API_DIR="$BASE_DIR/mt5api"
SERVER_DIR="$BASE_DIR/mt5server"
OS_NAME="$(uname -s)"

command_exists() {
  command -v "$1" >/dev/null 2>&1
}

install_with_brew() {
  if ! command_exists brew; then
    echo "Homebrew not found. Please install Homebrew first: https://brew.sh/"
    exit 1
  fi
  brew install "$@"
}

install_with_apt() {
  local pkg="$1"
  if command_exists sudo; then
    sudo apt-get update && sudo apt-get install -y "$pkg"
  else
    apt-get update && apt-get install -y "$pkg"
  fi
}

ensure_runtime() {
  if ! command_exists node; then
    echo "==> Node.js not found, installing..."
    case "$OS_NAME" in
      Darwin) install_with_brew node ;;
      Linux) install_with_apt nodejs ;;
      *) echo "Unsupported OS: $OS_NAME. Please install Node.js manually."; exit 1 ;;
    esac
  fi

  if ! command_exists dotnet; then
    echo "==> .NET runtime not found, installing..."
    case "$OS_NAME" in
      Darwin) install_with_brew --cask dotnet-sdk ;;
      Linux) install_with_apt dotnet-sdk-8.0 ;;
      *) echo "Unsupported OS: $OS_NAME. Please install .NET 8 manually."; exit 1 ;;
    esac
  fi
}

check_port() {
  local port="$1"
  if lsof -iTCP:"$port" -sTCP:LISTEN -n -P >/dev/null 2>&1; then
    echo "Port $port is already in use. Please stop existing process first."
    lsof -iTCP:"$port" -sTCP:LISTEN -n -P || true
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

if [ ! -f "$SERVER_DIR/.env" ]; then
  echo "Missing mt5server/.env"
  exit 1
fi

if [ ! -d "$API_DIR" ]; then
  echo "Missing mt5api publish output: $API_DIR"
  exit 1
fi

if [ ! -f "$SERVER_DIR/public/index.html" ]; then
  echo "Missing web assets: mt5server/public/index.html"
  exit 1
fi

if [ ! -f "$SERVER_DIR/dist/main.cjs" ]; then
  echo "Missing server bundle: mt5server/dist/main.cjs"
  exit 1
fi

ensure_runtime

ensure_server_npm_deps() {
  if (cd "$SERVER_DIR" && node -e "require.resolve('better-sqlite3')") >/dev/null 2>&1; then
    return 0
  fi
  echo "==> Installing server dependencies on this machine (npm; needs network). Safe across OS: no bundled node_modules."
  (
    cd "$SERVER_DIR"
    rm -rf node_modules
    if [ -f package-lock.json ]; then
      npm ci --no-fund --no-audit --omit=dev
    else
      npm install --no-fund --no-audit --omit=dev
    fi
  ) || return 1
  (cd "$SERVER_DIR" && node -e "require.resolve('better-sqlite3')") >/dev/null 2>&1
}

ensure_server_npm_deps || {
  echo "[ERROR] npm install failed. Need network and Node >= 20."
  exit 1
}

cleanup_port_listeners 3000
cleanup_port_listeners 5050
check_port 3000
check_port 5050

echo "==> Starting mt5api (:5050)"
(
  cd "$API_DIR"
  ASPNETCORE_URLS="http://0.0.0.0:5050" dotnet MT5API.WebHost.dll
) >"$BASE_DIR/logs/mt5api.log" 2>&1 &
API_PID=$!

echo "==> Starting mt5server (:3000)"
(
  cd "$SERVER_DIR"
  node dist/main.cjs
) >"$BASE_DIR/logs/mt5server.log" 2>&1 &
SERVER_PID=$!

cleanup() {
  echo "==> Stopping services..."
  kill "$SERVER_PID" "$API_PID" 2>/dev/null || true
  pkill -P "$SERVER_PID" 2>/dev/null || true
  pkill -P "$API_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM HUP

echo "==> Ready"
echo "Web: http://localhost:3000"
echo "Logs: $BASE_DIR/logs"
wait
