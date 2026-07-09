#!/bin/sh
echo "Starting Sentinel Security Monitor..."

# Ensure data directory exists
mkdir -p /data

# Start backend API
cd /app/backend
exec node dist/index.js
