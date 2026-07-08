#!/bin/bash
set -euo pipefail

ROOT="$(cd ../.. && pwd)"
API_ROOT="${ROOT}/apps/api"
WORKSPACE_PKGS=(agent-policy api-shared)

materialize_workspace_pkg() {
  local pkg="$1"
  local src="${ROOT}/packages/${pkg}"
  local repo_runtime_pkg="${ROOT}/packages/@vibey/${pkg}"
  local api_runtime_pkg="${API_ROOT}/node_modules/@vibey/${pkg}"

  # Serverless includeFiles bundle — dist + package.json only (no pnpm symlinks).
  # Runtime resolution prefers apps/api/node_modules, then the repo-level package copy.
  for target in "${repo_runtime_pkg}" "${api_runtime_pkg}"; do
    rm -rf "${target}"
    mkdir -p "${target}/dist"
    cp "${src}/package.json" "${target}/"
    cp -r "${src}/dist/." "${target}/dist/"
    if [[ "${pkg}" == "agent-policy" ]]; then
      TARGET_PACKAGE_JSON="${target}/package.json" node -e "const fs=require('fs');const p=process.env.TARGET_PACKAGE_JSON;const j=JSON.parse(fs.readFileSync(p,'utf8'));delete j.type;fs.writeFileSync(p,JSON.stringify(j,null,2)+'\n')"
    fi
  done
}

echo "vercel-build: cleaning workspace package outputs"
for pkg in "${WORKSPACE_PKGS[@]}"; do
  rm -rf "${ROOT}/packages/${pkg}/dist" "${ROOT}/packages/${pkg}/tsconfig.build.tsbuildinfo"
done

echo "vercel-build: building workspace packages"
cd "${ROOT}"
echo "vercel-build: @vibey/agent-policy (CJS for Nest serverless — ESM breaks require() on Vercel)"
cd "${ROOT}/packages/agent-policy"
pnpm exec tsc -p tsconfig.build.vercel.json
cd "${ROOT}"
npx pnpm@9 --filter=@vibey/api-shared run build

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
