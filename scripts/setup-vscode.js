const fs = require('fs');
const path = require('path');

function setupVSCodeSettings() {
  const vscodePath = path.join(__dirname, '..', '.vscode');
  const examplePath = path.join(vscodePath, 'settings-example.json');
  const settingsPath = path.join(vscodePath, 'settings.json');

  // Check if settings.json already exists
  if (!fs.existsSync(settingsPath)) {
    // Create .vscode directory if it doesn't exist
    if (!fs.existsSync(vscodePath)) {
      fs.mkdirSync(vscodePath, { recursive: true });
    }

    // Copy example settings to settings.json
    if (fs.existsSync(examplePath)) {
      fs.copyFileSync(examplePath, settingsPath);
      console.log('VS Code settings.json created successfully');
    } else {
      console.error('settings-example.json not found');
    }
  } else {
    console.log('VS Code settings.json already exists');
  }
}

setupVSCodeSettings();