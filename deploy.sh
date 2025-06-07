#!/bin/bash

echo "🚀 Starting deployment process..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ] && [ ! -d "frontend" ] && [ ! -d "backend" ]; then
    print_error "This script should be run from the project root directory"
    exit 1
fi

# Set environment
ENVIRONMENT=${1:-development}
print_status "Deploying to: $ENVIRONMENT"

# Backend deployment
print_status "Deploying backend..."
cd backend

# Install dependencies
print_status "Installing backend dependencies..."
npm ci --only=production

# Run tests
if [ "$ENVIRONMENT" != "production" ]; then
    print_status "Running backend tests..."
    npm test
fi

# Start/restart backend
print_status "Starting backend server..."
if command -v pm2 &> /dev/null; then
    pm2 delete resume-backend 2>/dev/null || true
    pm2 start index.js --name resume-backend
    print_status "Backend started with PM2"
else
    print_warning "PM2 not found. Starting with npm..."
    npm start &
    BACKEND_PID=$!
    print_status "Backend started with PID: $BACKEND_PID"
fi

cd ..

# Frontend deployment
print_status "Deploying frontend..."
cd frontend

# Install dependencies
print_status "Installing frontend dependencies..."
npm ci

# Run tests
if [ "$ENVIRONMENT" != "production" ]; then
    print_status "Running frontend tests..."
    npm test -- --watchAll=false
fi

# Build for production
if [ "$ENVIRONMENT" = "production" ]; then
    print_status "Building frontend for production..."
    npm run build

    # Copy build to backend public directory
    print_status "Copying build files to backend..."
    mkdir -p ../backend/public
    cp -r build/* ../backend/public/

    print_status "Frontend built and deployed to backend"
else
    print_status "Starting frontend development server..."
    npm start &
    FRONTEND_PID=$!
    print_status "Frontend started with PID: $FRONTEND_PID"
fi

cd ..

print_status "✅ Deployment completed successfully!"

if [ "$ENVIRONMENT" = "development" ]; then
    echo ""
    print_status "🌐 Application URLs:"
    echo "   Frontend: http://localhost:3000"
    echo "   Backend:  http://localhost:3001"
    echo "   API:      http://localhost:3001/api"
    echo ""
    print_status "📊 Health check: curl http://localhost:3001/health"
fi

---

# railway.json - Railway deployment configuration
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "numReplicas": 1,
    "sleepApplication": false,
    "restartPolicyType": "ON_FAILURE"
  }
}
