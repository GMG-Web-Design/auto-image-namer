const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const axios = require('axios');

let mainWindow;
let serverProcess;

// Check if server is running
async function waitForServer(url, timeout = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      await axios.get(url);
      return true;
    } catch (error) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  return false;
}

// Start the Node.js server
function startServer() {
  console.log('Starting server...');
  
  serverProcess = spawn('node', ['server.js'], {
    cwd: __dirname,
    stdio: 'inherit'
  });

  serverProcess.on('error', (error) => {
    console.error('Failed to start server:', error);
  });

  serverProcess.on('exit', (code) => {
    console.log(`Server process exited with code ${code}`);
  });
}

// Create the application window
async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false
    },
    icon: path.join(__dirname, 'assets', 'icon.png'), // We'll create this
    title: 'Auto Image Namer',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default'
  });

  // Start server and wait for it to be ready
  startServer();
  
  console.log('Waiting for server to start...');
  const serverReady = await waitForServer('http://localhost:3000');
  
  if (serverReady) {
    console.log('Server ready, loading application...');
    mainWindow.loadURL('http://localhost:3000');
  } else {
    console.error('Server failed to start within timeout');
    // Load a simple error page
    mainWindow.loadFile(path.join(__dirname, 'error.html'));
  }

  // Open external links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Development tools
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }
}

// App event handlers
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  // Kill the server process
  if (serverProcess) {
    serverProcess.kill();
  }
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Ensure server is killed when app quits
app.on('before-quit', () => {
  if (serverProcess) {
    serverProcess.kill();
  }
});

// Handle protocol for deep linking (optional)
app.setAsDefaultProtocolClient('auto-image-namer'); 