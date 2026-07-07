#!/bin/bash
set -euo pipefail

ROOT="$(cd ../.. && pwd)"
API_ROOT="${ROOT}/apps/api"
WORKSPACE_PKGS=(agent-policy api-shared)

materialize_workspace_pkg() {
  local pkg="$1"
  local src="${ROOT}/packages/${pkg}"

  # Serverless includeFiles bundle — dist + package.json only (no pnpm symlinks).
  # Runtime resolution uses pnpm's node_modules/@vibey/* with nested deps (jose, etc.).
  rm -rf "${ROOT}/packages/@vibey/${pkg}"
  mkdir -p "${ROOT}/packages/@vibey/${pkg}/dist"
  cp "${src}/package.json" "${ROOT}/packages/@vibey/${pkg}/"
  cp -r "${src}/dist/." "${ROOT}/packages/@vibey/${pkg}/dist/"
}

echo "vercel-build: cleaning workspace package outputs"
for pkg in "${WORKSPACE_PKGS[@]}"; do
  rm -rf "${ROOT}/packages/${pkg}/dist" "${ROOT}/packages/${pkg}/tsconfig.build.tsbuildinfo"
done

echo "vercel-build: building workspace packages"
cd "${ROOT}"
npx pnpm@9 --filter=@vibey/agent-policy --filter=@vibey/api-shared run build

echo "vercel-build: rewriting workspace deps to file: paths"
cd "${API_ROOT}"
node -e "const p=require('./package.json');for (const pkg of ['api-shared','agent-policy']) { p.dependencies['@vibey/'+pkg]='file:../../packages/'+pkg; } require('fs').writeFileSync('./package.json',JSON.stringify(p,null,2))"

echo "vercel-build: reinstalling api deps"
cd "${ROOT}"
npx pnpm@9 install --no-frozen-lockfile --filter @vibey/api...

echo "vercel-build: nest build"
cd "${API_ROOT}"
export NODE_OPTIONS="${NODE_OPTIONS:-} --max-old-space-size=6144"
pnpm exec nest build

echo "vercel-build: materializing workspace packages for serverless runtime"
mkdir -p "${ROOT}/packages/@vibey"
for pkg in "${WORKSPACE_PKGS[@]}"; do
  materialize_workspace_pkg "${pkg}"
  test -f "${ROOT}/packages/@vibey/${pkg}/dist/index.js"
  test -f "${API_ROOT}/node_modules/@vibey/${pkg}/dist/index.js"
done

echo "vercel-build: done"
