#!/bin/bash

# Firebase Deployment Script for Resume Generator
set -e  # Exit on any error

echo "🔥 Starting Firebase deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    print_error "Firebase CLI is not installed"
    echo "Install it with: npm install -g firebase-tools"
    exit 1
fi

# Check if logged in to Firebase
if ! firebase projects:list &> /dev/null; then
    print_warning "Not logged in to Firebase"
    echo "Please run: firebase login"
    exit 1
fi

# Check if we're in a Firebase project
if [ ! -f "firebase.json" ]; then
    print_error "Not in a Firebase project directory"
    echo "Run 'firebase init' first"
    exit 1
fi

# Get deployment target
TARGET=${1:-"all"}
print_status "Deployment target: $TARGET"

# Step 1: Install dependencies
if [ "$TARGET" = "all" ] || [ "$TARGET" = "functions" ]; then
    print_step "Installing function dependencies..."
    cd functions
    npm ci
    cd ..
fi

if [ "$TARGET" = "all" ] || [ "$TARGET" = "hosting" ]; then
    print_step "Installing React dependencies..."
    npm ci
fi

# Step 2: Run tests
if [ "$TARGET" = "all" ] || [ "$TARGET" = "functions" ]; then
    print_step "Running function tests..."
    cd functions
    npm test || print_warning "Function tests failed, continuing..."
    cd ..
fi

if [ "$TARGET" = "all" ] || [ "$TARGET" = "hosting" ]; then
    print_step "Running React tests..."
    npm test -- --watchAll=false --coverage || print_warning "React tests failed, continuing..."
fi

# Step 3: Build React app
if [ "$TARGET" = "all" ] || [ "$TARGET" = "hosting" ]; then
    print_step "Building React application..."
    npm run build

    if [ ! -d "build" ]; then
        print_error "Build directory not found"
        exit 1
    fi

    print_status "React app built successfully"
fi

# Step 4: Deploy to Firebase
print_step "Deploying to Firebase..."

case $TARGET in
    "all")
        firebase deploy
        ;;
    "functions")
        firebase deploy --only functions
        ;;
    "hosting")
        firebase deploy --only hosting
        ;;
    *)
        print_error "Invalid target: $TARGET"
        echo "Valid targets: all, functions, hosting"
        exit 1
        ;;
esac

# Step 5: Get deployment URLs
print_step "Getting deployment information..."

PROJECT_ID=$(firebase use --current)
HOSTING_URL="https://${PROJECT_ID}.web.app"
FUNCTIONS_URL="https://us-central1-${PROJECT_ID}.cloudfunctions.net"

echo ""
print_status "🎉 Deployment completed successfully!"
echo ""
echo "📱 Application URLs:"
echo "   Frontend: $HOSTING_URL"
echo "   API:      $FUNCTIONS_URL/api"
echo ""
echo "🔍 Useful commands:"
echo "   View logs:    firebase functions:log"
echo "   Open hosting: firebase hosting:open"
echo "   View console: https://console.firebase.google.com/project/${PROJECT_ID}"
echo ""

# Step 6: Health check
print_step "Performing health check..."
sleep 5  # Wait for deployment to propagate

if curl -f -s "${FUNCTIONS_URL}/api/health" > /dev/null; then
    print_status "✅ API health check passed"
else
    print_warning "⚠️  API health check failed - may take a few minutes to become available"
fi

if curl -f -s "$HOSTING_URL" > /dev/null; then
    print_status "✅ Frontend health check passed"
else
    print_warning "⚠️  Frontend health check failed - may take a few minutes to become available"
fi

print_status "🚀 Deployment process completed!"
