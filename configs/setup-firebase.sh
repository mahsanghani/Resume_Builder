#!/bin/bash
# setup-firebase.sh - Complete Firebase setup script

set -e

echo "🔥 Firebase Resume Generator Setup"
echo "=================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() { echo -e "${GREEN}[INFO]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }
print_step() { echo -e "${BLUE}[STEP]${NC} $1"; }

# Check prerequisites
print_step "Checking prerequisites..."

# Node.js
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed"
    echo "Please install Node.js 16+ from https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    print_error "Node.js version 16+ required, found: $(node -v)"
    exit 1
fi

print_status "Node.js $(node -v) ✓"

# npm
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed"
    exit 1
fi

print_status "npm $(npm -v) ✓"

# Firebase CLI
if ! command -v firebase &> /dev/null; then
    print_warning "Firebase CLI not found, installing..."
    npm install -g firebase-tools
fi

print_status "Firebase CLI $(firebase --version | head -1) ✓"

# Step 1: Firebase Authentication
print_step "Firebase Authentication..."

if ! firebase projects:list &> /dev/null; then
    print_status "Please login to Firebase:"
    firebase login
else
    print_status "Already logged in to Firebase ✓"
fi

# Step 2: Create React App (if not exists)
if [ ! -f "package.json" ]; then
    print_step "Creating React application..."

    APP_NAME=${1:-"resume-generator-firebase"}
    npx create-react-app $APP_NAME
    cd $APP_NAME

    print_status "React app created: $APP_NAME"
else
    print_status "Using existing React app"
fi

# Step 3: Install dependencies
print_step "Installing React dependencies..."
npm install lucide-react
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

print_status "React dependencies installed ✓"

# Step 4: Initialize Firebase
print_step "Initializing Firebase project..."

if [ ! -f "firebase.json" ]; then
    echo "Please select the following options:"
    echo "✅ Hosting: Configure files for Firebase Hosting"
    echo "✅ Functions: Configure a Cloud Functions directory"
    echo "❌ Firestore, Storage, etc. (optional)"
    echo ""

    firebase init
else
    print_status "Firebase already initialized ✓"
fi

# Step 5: Install Functions dependencies
print_step "Installing Functions dependencies..."

cd functions
npm install express cors axios cheerio
npm install -D eslint firebase-functions-test jest
cd ..

print_status "Functions dependencies installed ✓"

# Step 6: Create directory structure
print_step "Setting up project structure..."

# Create src directory structure if it doesn't exist
mkdir -p src/components
mkdir -p src/hooks
mkdir -p src/utils
mkdir -p src/config

# Step 7: Configure React for Firebase
print_step "Configuring React for Firebase..."

# Update package.json with Firebase scripts
cat > package.json.tmp << 'EOF'
{
  "name": "resume-generator-firebase",
  "version": "1.0.0",
  "private": true,
  "homepage": ".",
  "dependencies": {
    "@testing-library/jest-dom": "^5.16.5",
    "@testing-library/react": "^13.4.0",
    "@testing-library/user-event": "^14.4.3",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-scripts": "5.0.1",
    "lucide-react": "^0.263.1",
    "web-vitals": "^3.3.2"
  },
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test",
    "eject": "react-scripts eject",
    "firebase:serve": "firebase emulators:start",
    "firebase:deploy": "npm run build && firebase deploy",
    "firebase:functions": "firebase deploy --only functions",
    "firebase:hosting": "npm run build && firebase deploy --only hosting"
  },
  "eslintConfig": {
    "extends": [
      "react-app",
      "react-app/jest"
    ]
  },
  "browserslist": {
    "production": [
      ">0.2%",
      "not dead",
      "not op_mini all"
    ],
    "development": [
      "last 1 chrome version",
      "last 1 firefox version",
      "last 1 safari version"
    ]
  },
  "devDependencies": {
    "firebase-tools": "^12.5.4",
    "tailwindcss": "^3.3.3",
    "autoprefixer": "^10.4.15",
    "postcss": "^8.4.29"
  }
}
EOF

mv package.json.tmp package.json

# Create API configuration for React
cat > src/config/api.js << 'EOF'
// API configuration for Firebase deployment
const isDevelopment = process.env.NODE_ENV === 'development';
const isFirebaseEmulator = window.location.hostname === 'localhost' && window.location.port === '5000';

// Firebase Functions URL
const getFunctionsBaseUrl = () => {
  if (isDevelopment && !isFirebaseEmulator) {
    // Local development with emulator
    return 'http://localhost:5001/YOUR_PROJECT_ID/us-central1/api';
  } else {
    // Production or Firebase emulator
    return '/api';
  }
};

export const API_BASE_URL = getFunctionsBaseUrl();

export const API_ENDPOINTS = {
  github: (username) => `${API_BASE_URL}/github/${username}`,
  linkedin: (profileId) => `${API_BASE_URL}/linkedin/${profileId}`,
  profile: `${API_BASE_URL}/profile`,
  resume: `${API_BASE_URL}/resume/generate`,
  health: `${API_BASE_URL}/health`
};

// Firebase config (replace with your project config)
export const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id"
};
EOF

# Create updated Tailwind config
cat > tailwind.config.js << 'EOF'
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      borderWidth: {
        '3': '3px',
      },
      animation: {
        'spin': 'spin 1s linear infinite',
        'pulse': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}
EOF

# Create React hook for Firebase Functions
cat > src/hooks/useFirebaseFunctions.js << 'EOF'
import { useState, useCallback } from 'react';
import { API_ENDPOINTS } from '../config/api';

export const useFirebaseFunctions = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const callFunction = useCallback(async (url, options = {}) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchGithubProfile = useCallback(async (username) => {
    const result = await callFunction(API_ENDPOINTS.github(username));
    return result.data;
  }, [callFunction]);

  const fetchLinkedinProfile = useCallback(async (profileId) => {
    const result = await callFunction(API_ENDPOINTS.linkedin(profileId));
    return result.data;
  }, [callFunction]);

  const generateResume = useCallback(async (profileData) => {
    const result = await callFunction(API_ENDPOINTS.resume, {
      method: 'POST',
      body: JSON.stringify({ profileData }),
    });
    return result.data;
  }, [callFunction]);

  return {
    loading,
    error,
    setError,
    fetchGithubProfile,
    fetchLinkedinProfile,
    generateResume,
    callFunction
  };
};
EOF

print_status "React configuration completed ✓"

# Step 8: Environment setup
print_step "Setting up environment configuration..."

# Create .env.example
cat > .env.example << 'EOF'
# React App Environment Variables (prefix with REACT_APP_)
REACT_APP_FIREBASE_API_KEY=your_api_key_here
REACT_APP_FIREBASE_PROJECT_ID=your_project_id_here
REACT_APP_ENVIRONMENT=development

# Optional: Analytics
REACT_APP_GA_TRACKING_ID=your_google_analytics_id
EOF

# Create functions .env.example
cat > functions/.env.example << 'EOF'
# Firebase Functions Environment Variables
GITHUB_TOKEN=github_pat_your_token_here
NODE_ENV=production
EOF

print_status "Environment files created ✓"

# Step 9: Create deployment script
cat > deploy-firebase.sh << 'EOF'
#!/bin/bash
# Firebase deployment script

set -e

echo "🔥 Deploying Resume Generator to Firebase..."

TARGET=${1:-"all"}

case $TARGET in
    "all")
        npm run build
        firebase deploy
        ;;
    "functions")
        firebase deploy --only functions
        ;;
    "hosting")
        npm run build
        firebase deploy --only hosting
        ;;
    *)
        echo "Usage: ./deploy-firebase.sh [all|functions|hosting]"
        exit 1
        ;;
esac

echo "✅ Deployment completed!"

# Get project info
PROJECT_ID=$(firebase use --current)
echo ""
echo "🌐 Your app is live at:"
echo "   https://${PROJECT_ID}.web.app"
echo "   https://${PROJECT_ID}.firebaseapp.com"
echo ""
echo "📊 Firebase Console:"
echo "   https://console.firebase.google.com/project/${PROJECT_ID}"
EOF

chmod +x deploy-firebase.sh

print_status "Deployment script created ✓"

# Step 10: Final instructions
print_step "Setup completed! Next steps:"

echo ""
echo "📋 TODO:"
echo "1. Update firebase config in src/config/api.js with your project details"
echo "2. Replace YOUR_PROJECT_ID in the API configuration"
echo "3. Set environment variables in .env (copy from .env.example)"
echo "4. Test locally: npm start (React) + firebase emulators:start (Functions)"
echo "5. Deploy: ./deploy-firebase.sh"
echo ""

print_status "🎉 Firebase Resume Generator setup completed!"

# Get current project ID if available
if firebase use --current &> /dev/null; then
    PROJECT_ID=$(firebase use --current)
    echo ""
    print_status "Current Firebase project: $PROJECT_ID"
    echo ""
    echo "📝 Update these files with your project ID:"
    echo "   - src/config/api.js (replace YOUR_PROJECT_ID)"
    echo "   - .firebaserc (should already be correct)"
    echo ""
    echo "🧪 Test your setup:"
    echo "   firebase emulators:start    # Start local emulators"
    echo "   npm start                   # Start React development server"
    echo ""
    echo "🚀 Deploy when ready:"
    echo "   ./deploy-firebase.sh        # Deploy everything"
    echo ""
else
    print_warning "No Firebase project selected"
    echo "Run: firebase use --add"
