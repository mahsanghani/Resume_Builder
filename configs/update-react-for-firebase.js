const fs = require('fs');
const path = require('path');

console.log('🔄 Updating React app for Firebase Functions...');

// Update package.json
const packageJsonPath = './package.json';
if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

    // Remove proxy since we're using Firebase hosting
    delete packageJson.proxy;

    // Add Firebase scripts
    packageJson.scripts = {
        ...packageJson.scripts,
        "firebase:serve": "firebase emulators:start",
        "firebase:deploy": "npm run build && firebase deploy",
        "firebase:functions": "firebase deploy --only functions",
        "firebase:hosting": "npm run build && firebase deploy --only hosting"
    };

    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    console.log('✅ Updated package.json');
}

// Update App.js to use Firebase API endpoints
const appJsPath = './src/App.js';
if (fs.existsSync(appJsPath)) {
    let appContent = fs.readFileSync(appJsPath, 'utf8');

    // Replace localhost API calls with relative paths
    appContent = appContent.replace(
        /http:\/\/localhost:3001\/api/g,
        '/api'
    );

    // Add import for API config
    if (!appContent.includes("import { API_BASE_URL }")) {
        appContent = `import { API_BASE_URL } from './config/api';\n` + appContent;
    }

    fs.writeFileSync(appJsPath, appContent);
    console.log('✅ Updated App.js for Firebase');
}

// Create API config directory
const configDir = './src/config';
if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
    console.log('✅ Created config directory');
}

console.log('🎉 React app updated for Firebase deployment!');
