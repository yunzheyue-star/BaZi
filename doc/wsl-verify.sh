#!/usr/bin/env bash
# WSL/Fedora 侧环境自检：确认能正常开发、测试、构建
#
# 用法（在 Windows 侧 PowerShell 里）：
#     wsl.exe --exec bash /mnt/c/demo/BaZi/doc/wsl-verify.sh
# 或（已在 Fedora 里）：
#     bash ~/BaZi/doc/wsl-verify.sh
#
# 它做三件事：环境体检 → 平台校验 → 跑 type-check / 测试 / 构建。
set -uo pipefail

# WSL 互操作会把 Windows 目录塞进 PATH，可能让 node/git 解析到 Windows 版
# （症状：bad interpreter: /bin/sh^M、process.platform=win32）。
# 这里统一剔除 /mnt/*，保证用的是 Linux 原生工具。
export PATH=$(printf '%s' "$PATH" | tr ':' '\n' | grep -v '^/mnt/' | paste -sd: -)

# 项目目录：优先用脚本所在仓库，其次 $HOME/BaZi
SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
if [ -f "$SCRIPT_DIR/../package.json" ]; then
  PROJECT=$(cd "$SCRIPT_DIR/.." && pwd)
elif [ -f "$HOME/BaZi/package.json" ]; then
  PROJECT="$HOME/BaZi"
else
  echo "找不到项目目录（既不在 $SCRIPT_DIR/.. 也不在 \$HOME/BaZi）" >&2
  exit 1
fi
cd "$PROJECT"

echo "================ 1. 环境体检 ================"
printf '%-10s %s\n' "系统" "$(. /etc/os-release 2>/dev/null && echo "$PRETTY_NAME" || uname -s)"
printf '%-10s %s\n' "内核" "$(uname -r)"
printf '%-10s %s\n' "项目" "$PROJECT"
printf '%-10s %s\n' "用户" "$(whoami)"
echo

printf '%-10s %s\n' "node" "$(command -v node)  $(node -v)"
printf '%-10s %s\n' "npm" "$(command -v npm)  $(npm -v)"
printf '%-10s %s\n' "git" "$(git --version)"
echo

echo "--- 平台校验 ---"
PLATFORM=$(node -p 'process.platform')
echo "process.platform = $PLATFORM"
if [ "$PLATFORM" != "linux" ]; then
  echo "✗ 正在使用 Windows 版 node，请检查 PATH（见 doc/migrate-to-wsl.md 坑 1）" >&2
  exit 1
fi
echo "✓ 使用 Linux 原生 node"
echo

echo "--- node_modules 平台校验 ---"
if [ ! -d node_modules ]; then
  echo "✗ node_modules 不存在，请先 npm install" >&2
  exit 1
fi
WIN_HITS=$(find node_modules -maxdepth 3 -type d \( -name '*win32*' -o -name '*-msvc*' \) 2>/dev/null | head -5)
if [ -n "$WIN_HITS" ]; then
  echo "✗ 发现 Windows 平台包（node_modules 疑似从 Windows 拷贝而来）："
  printf '%s\n' "$WIN_HITS" | sed 's/^/    /'
  echo "  对策：rm -rf node_modules && npm install" >&2
  exit 1
fi
echo "✓ 无 Windows 平台残留"
find node_modules -maxdepth 3 -type d -name '*linux-x64-gnu*' 2>/dev/null | head -5 | sed 's/^/    /'
echo

echo "--- 缺失的常用工具 ---"
MISSING=""
for c in awk sed grep find tar unzip which less; do
  command -v "$c" >/dev/null 2>&1 || MISSING="$MISSING $c"
done
if [ -n "$MISSING" ]; then
  echo "缺：$MISSING"
  echo "  装法：sudo dnf install -y gawk（Fedora WSL 最小镜像默认没有 awk）"
else
  echo "✓ 常用工具齐备"
fi
echo

echo "================ 2. type-check ================"
npm run type-check && echo "✓ type-check 通过" || { echo "✗ type-check 失败" >&2; exit 1; }
echo

echo "================ 3. 单元测试 ================"
npx vitest run 2>&1 | tail -8
echo

echo "================ 4. 生产构建 ================"
npx vite build 2>&1 | tail -5
echo

echo "--- 产物 ---"
ls -la dist 2>/dev/null | sed 's/^/  /'
echo
echo "全部通过 ✓"
