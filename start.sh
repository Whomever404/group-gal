#!/usr/bin/env bash
# 《😂群聊 · 全群攻陷计划》启动脚本 —— 本地服务器 + file:// 双保险。
# 用法： ./start.sh [端口]     默认 8931
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
PORT="${1:-8931}"

# 优先用构建产物；没有就退回仓库里提交的单文件副本（双保险）
if [ -f "$ROOT/dist/index.html" ]; then
  DIR="$ROOT/dist"
else
  DIR="$ROOT"
fi
FILE="$DIR/index.html"
if [ ! -f "$FILE" ]; then
  FILE="$ROOT/group-chat-galgame-v2-modular.html"
  DIR="$ROOT"
fi

if [ ! -f "$FILE" ]; then
  echo "未找到可玩的单文件" >&2
  echo "请先执行： npm install && npm run build" >&2
  exit 1
fi

echo "▶ 单文件版（离线）: file://$FILE"
echo "▶ 本地服务器    : http://localhost:$PORT/$(basename "$FILE")"

case "$(uname -s)" in
  Darwin) OPEN="open" ;;
  Linux)  OPEN="xdg-open" ;;
  *)      OPEN="" ;;
esac

# 起本地服务器（Python3 自带 http.server，无需任何依赖）
if command -v python3 >/dev/null 2>&1; then
  ( sleep 1; [ -n "$OPEN" ] && "$OPEN" "http://localhost:$PORT/$(basename "$FILE")" >/dev/null 2>&1 || true ) &
  echo "按 Ctrl+C 停止服务器。"
  cd "$DIR" && exec python3 -m http.server "$PORT"
else
  echo "未找到 python3 —— 直接双击/浏览器打开上面的 file:// 链接即可游玩（双保险）。" >&2
fi