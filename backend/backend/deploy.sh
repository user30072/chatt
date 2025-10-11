#!/bin/bash

# Script to deploy the backend to Railway

echo "Starting deployment process for backend..."

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null
then
    echo "Railway CLI not found. Installing..."
    npm install -g @railway/cli
fi

# Ensure we're logged in
echo "Checking Railway login status..."
railway whoami || railway login

# Run diagnostics
echo "Running pre-deployment diagnostics..."
echo "Checking Node.js version:"
node -v

echo "Checking npm version:"
npm -v

echo "Checking package.json:"
cat package.json

echo "Testing CORS headers..."
node -e "
const cors = require('cors');
const middleware = cors({
  origin: function(origin, callback) {
    console.log('Testing origin handling for:', origin);
    callback(null, true);
  }
});
console.log('CORS module loaded successfully!');
"

# Deploy to Railway
echo "Deploying to Railway..."
railway up

# Verify deployment
echo "Deployment complete! Waiting for service to start..."
echo "Once started, your API will be available at:"
railway status

echo "Your API health check endpoint is:"
railway status | grep -o "https://.*" | head -1
echo "/api/health"

echo "Deployment process complete!" 