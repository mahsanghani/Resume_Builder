#!/bin/bash

echo "🧪 Testing Firebase setup..."

# Check if all required files exist
check_file() {
    if [ -f "$1" ]; then
    echo "✅ $1"
else
    echo "❌ $1 (missing)"
    return 1
    fi
}

echo "📁 Checking project structure..."
check_file "firebase.json"
check_file "functions/index.js"
check_file "functions/package.json"
check_file "src/config/api.js"
check_file "deploy-firebase.sh"

echo ""
echo "🔧 Checking Firebase CLI..."
if command -v firebase &> /dev/null; then
echo "✅ Firebase CLI installed: $(firebase --version | head -1)"

if firebase projects:list &> /dev/null; then
echo "✅ Logged in to Firebase"

if firebase use --current &> /dev/null; then
PROJECT_ID=$(firebase use --current)
echo "✅ Current project: $PROJECT_ID"
else
echo "⚠️  No Firebase project selected"
fi
else
echo "❌ Not logged in to Firebase"
fi
else
echo "❌ Firebase CLI not installed"
fi

echo ""
echo "📦 Checking dependencies..."
if [ -f "package.json" ]; then
if npm list react &> /dev/null; then
echo "✅ React installed"
else
echo "❌ React not installed"
fi

if npm list lucide-react &> /dev/null; then
echo "✅ Lucide React installed"
else
echo "⚠️  Lucide React not installed"
fi
fi

if [ -f "functions/package.json" ]; then
cd functions
if npm list firebase-functions &> /dev/null; then
echo "✅ Firebase Functions installed"
else
echo "❌ Firebase Functions not installed"
fi

if npm list express &> /dev/null; then
echo "✅ Express installed"
else
echo "❌ Express not installed"
fi
cd ..
fi

echo ""
echo "🔍 Setup verification complete!"
