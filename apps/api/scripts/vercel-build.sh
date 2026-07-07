#!/bin/bash
set -euo pipefail

# Build script for Vercel deployment
# 1. Build workspace packages the API depends on
cd ../.. && npx pnpm@9 --filter=@vibey/agent-policy --filter=@vibey/api-shared run build

# 2. Rewrite workspace:* to file: for Vercel's npm-based function bundler
cd apps/api
node -e "const p=require('./package.json');p.dependencies['@vibey/api-shared']='file:../../packages/api-shared';p.dependencies['@vibey/agent-policy']='file:../../packages/agent-policy';require('fs').writeFileSync('./package.json',JSON.stringify(p,null,2))"

# 3. Re-install API deps after rewrite so workspace packages are materialized for bundling
cd ../..
npx pnpm@9 install --no-frozen-lockfile --filter @vibey/api...

# 4. Build the NestJS API
cd apps/api
npx @nestjs/cli build

# 5. Replace workspace symlinks with real files for serverless runtime resolution
for pkg in api-shared agent-policy; do
  rm -rf "node_modules/@vibey/${pkg}"
  mkdir -p "node_modules/@vibey/${pkg}/dist"
  cp "../../packages/${pkg}/package.json" "node_modules/@vibey/${pkg}/"
  cp -r "../../packages/${pkg}/dist/"* "node_modules/@vibey/${pkg}/dist/"
done

# 6. Mirror packages to scoped folder under /packages for NODE_PATH fallback resolution
mkdir -p ../../packages/@vibey
for pkg in api-shared agent-policy; do
  rm -rf "../../packages/@vibey/${pkg}"
  cp -r "../../packages/${pkg}" "../../packages/@vibey/${pkg}"
done
