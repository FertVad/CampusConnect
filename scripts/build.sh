#!/bin/bash

# Set production environment
export NODE_ENV=production

# Create dist directory if it doesn't exist
mkdir -p dist

# Build the client
echo "Building client..."
npx vite build

# Build the server
echo "Building server..."
npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist

echo "Build completed!"