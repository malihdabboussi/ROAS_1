#!/bin/bash
set -euo pipefail

# Build script for Vercel deployment
# 1. Build the shared package first
cd ../.. && npx pnpm@9 --filter=@vibey/api-shared run build

# 2. Rewrite workspace:* to file: for Vercel's npm-based function bundler
cd apps/api
node -e "const p=require('./package.json');p.dependencies['@vibey/api-shared']='file:../../packages/api-shared';require('fs').writeFileSync('./package.json',JSON.stringify(p,null,2))"

# 3. Re-install API deps after rewrite so @vibey/api-shared is materialized for bundling
cd ../..
npx pnpm@9 install --no-frozen-lockfile --filter @vibey/api...

# 4. Build the NestJS API
cd apps/api
npx @nestjs/cli build

# 5. Replace workspace symlink with real files for serverless runtime resolution
rm -rf node_modules/@vibey/api-shared
mkdir -p node_modules/@vibey/api-shared/dist
cp ../../packages/api-shared/package.json node_modules/@vibey/api-shared/
cp -r ../../packages/api-shared/dist/* node_modules/@vibey/api-shared/dist/

# 6. Mirror package to scoped folder under /packages for NODE_PATH fallback resolution
mkdir -p ../../packages/@vibey
rm -rf ../../packages/@vibey/api-shared
cp -r ../../packages/api-shared ../../packages/@vibey/api-shared
