#!/bin/sh
# Startup script for agent-api inside Docker container
# Sets NODE_PATH so the deeply-nested NestJS build output can find node_modules
cd /app/agent-api
NODE_PATH=/app/agent-api/node_modules exec node --enable-source-maps /app/agent-api/dist/apps/agent-api/src/main.js
