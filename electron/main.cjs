const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

// Check if we're in development or production
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    minWidth: 1280,
    minHeight: 720,
    backgroundColor: '#070707',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      webSecurity: true,
    },
    titleBarStyle: 'hiddenInset', // macOS
    frame: true,
    show: false, // Don't show until ready
  });

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    // In production, the app is packaged
    // When packaged with electron-packager, the structure is:
    // app.asar or app/ contains the entire project
    // dist/ is inside app/
    let distPath;
    
    // Try different possible paths
    const pathsToTry = [
      path.join(__dirname, '../dist/index.html'), // Relative to electron/main.cjs
      path.join(process.resourcesPath, 'app/dist/index.html'), // Resources path
      path.join(app.getAppPath(), 'dist/index.html'), // App path
    ];
    
    let found = false;
    for (const tryPath of pathsToTry) {
      if (fs.existsSync(tryPath)) {
        distPath = tryPath;
        found = true;
        console.log('Loading from:', distPath);
        break;
      }
    }
    
    if (found) {
      // Load with file:// protocol to ensure proper base path
      const fileUrl = 'file://' + distPath;
      console.log('Loading file from:', fileUrl);
      mainWindow.loadFile(distPath);
      
      // Enable console for debugging
      mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
        console.error('Failed to load:', validatedURL, errorCode, errorDescription);
      });
      
      mainWindow.webContents.on('console-message', (event, level, message) => {
        console.log('[Renderer]', message);
      });
    } else {
      // Debug: Show what paths we tried
      console.error('Could not find dist/index.html. Tried:');
      pathsToTry.forEach(p => console.error('  -', p, fs.existsSync(p) ? 'EXISTS' : 'NOT FOUND'));
      
      // Try loading from app path directly
      const appPath = app.getAppPath();
      console.log('App path:', appPath);
      const directPath = path.join(appPath, 'dist/index.html');
      console.log('Trying direct path:', directPath, fs.existsSync(directPath));
      
      if (fs.existsSync(directPath)) {
        mainWindow.loadFile(directPath);
      } else {
        // Last resort: show error page
        mainWindow.loadURL('data:text/html,<html><body style="background:#070707;color:#fff;padding:40px;font-family:monospace;"><h1>Error: Could not load application</h1><p>App path: ' + appPath + '</p><p>Looking for: dist/index.html</p></body></html>');
      }
    }
  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (isDev) {
      mainWindow.webContents.openDevTools();
    }
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Prevent navigation to external URLs
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    
    if (isDev && parsedUrl.origin === 'http://localhost:3000') {
      return;
    }
    
    if (parsedUrl.origin !== `file://${path.join(__dirname, '../dist')}`) {
      event.preventDefault();
    }
  });

  // Handle new window (prevent popups)
  mainWindow.webContents.setWindowOpenHandler(() => {
    return { action: 'deny' };
  });
}

// App event handlers
app.whenReady().then(() => {
  createWindow();

  // macOS: Re-create window when dock icon is clicked
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed (except macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
  });
});

