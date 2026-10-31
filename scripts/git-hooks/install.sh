#!/bin/bash
# PayNShip v2 — git hooks installer
#
# scripts/git-hooks/pre-commit → .git/hooks/pre-commit symlink 설치.
# 새 머신/clone 후 1회 실행: bash scripts/git-hooks/install.sh
#
# 또는 package.json postinstall 에서 자동 실행 (선택).

set -eu

REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
HOOK_SRC="$REPO_ROOT/scripts/git-hooks/pre-commit"
HOOK_DST="$REPO_ROOT/.git/hooks/pre-commit"

if [ ! -f "$HOOK_SRC" ]; then
  echo "❌ Source not found: $HOOK_SRC"
  exit 1
fi

if [ ! -d "$REPO_ROOT/.git" ]; then
  echo "❌ Not a git repo: $REPO_ROOT"
  exit 1
fi

# 기존 hook 백업
if [ -e "$HOOK_DST" ] && [ ! -L "$HOOK_DST" ]; then
  cp "$HOOK_DST" "$HOOK_DST.bak-$(date +%s)"
  echo "ℹ Existing hook backed up to $HOOK_DST.bak-*"
fi

chmod +x "$HOOK_SRC"
ln -sf "$HOOK_SRC" "$HOOK_DST"

echo "✓ pre-commit hook installed:"
echo "  $HOOK_DST → $HOOK_SRC"
echo ""
echo "테스트:"
echo "  echo 'test' > .env.test && git add .env.test && git commit -m 'test'"
echo "  (G2가 차단해야 함)"
echo ""
echo "비활성화 (불가피한 경우만):"
echo "  git commit --no-verify"
