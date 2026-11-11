const fs = require('fs');
const path = require('path');
const { app, BrowserWindow, screen, shell } = require('electron');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const http = require('http');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Hardware Acceleration & Performance Flags
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('enable-smooth-scrolling');

// Ensure Single Instance Lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
  process.exit(0);
}

// Logging Configuration (Stored in safe userData directory)
let logStream = null;
try {
  const logDir = app ? app.getPath('userData') : process.cwd();
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  logStream = fs.createWriteStream(path.join(logDir, 'app.log'), { flags: 'a' });
} catch (e) {
  // Fallback silently if userData is not yet accessible
}

const origConsoleLog = console.log;
const origConsoleError = console.error;
console.log = function (...args) {
  const msg = `[${new Date().toISOString()}] [INFO] ` + args.map(a => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ');
  if (logStream) logStream.write(msg + '\n');
  origConsoleLog.apply(console, args);
};
console.error = function (...args) {
  const msg = `[${new Date().toISOString()}] [ERROR] ` + args.map(a => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ');
  if (logStream) logStream.write(msg + '\n');
  origConsoleError.apply(console, args);
};

console.log("Shatab Application Starting...");

let mainWindow = null;
let httpServer = null;
let isServerStarted = false;

const PORT = process.env.PORT || 5050;
const LOCAL_DB = "mongodb://127.0.0.1:27017/Finishes";
const CLOUD_DB = "mongodb+srv://ah_db_user:Ah20192344@newcluster.iloyqea.mongodb.net/Finishes";
const DB_URI = process.env.DATABASE_URL
  ? (process.env.DATABASE_URL.includes("mongodb") ? process.env.DATABASE_URL : `mongodb://${process.env.DATABASE_URL}/Finishes`)
  : LOCAL_DB;

/**
 * Initialize and start the Express Backend Server
 */
function startBackendServer() {
  if (isServerStarted) return Promise.resolve();

  return new Promise((resolve) => {
    try {
      const appExp = express();

      appExp.use(cors());
      appExp.use(bodyParser.json({ limit: '50mb' }));
      appExp.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

      // Ensure uploads folder exists
      const uploadsDir = path.join(__dirname, 'uploads');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      appExp.use('/uploads', express.static(uploadsDir));

      // Serve React frontend static files
      const distDir = path.join(__dirname, 'dist');
      appExp.use(express.static(distDir));

      // API Routes
      appExp.use('/api/client', require('./routes/clientsRoutes'));
      appExp.use('/api/invoice', require('./routes/invoicesRoutes'));
      appExp.use('/api/accountStatement', require('./routes/accountStatementsRoutes'));
      appExp.use('/api/transaction', require('./routes/transactionsRoutes'));
      appExp.use('/api/item', require('./routes/itemesRoutes'));
      appExp.use('/api/apartment', require('./routes/apartmentsRoutes'));

      // SPA fallback to index.html for client-side routing
      appExp.get('*', (req, res) => {
        const indexPath = path.join(distDir, 'index.html');
        if (fs.existsSync(indexPath)) {
          res.sendFile(indexPath);
        } else {
          res.status(404).send('Application bundle not found');
        }
      });

      httpServer = http.createServer(appExp);

      httpServer.listen(PORT, () => {
        console.log(`Internal API server running smoothly on port ${PORT}`);
        isServerStarted = true;

        // Connect to MongoDB: Try primary DB, fallback to cloud Atlas DB if local fails
        console.log(`Connecting to MongoDB (${DB_URI})...`);
        mongoose
          .connect(DB_URI, { serverSelectionTimeoutMS: 4000 })
          .then(() => {
            console.log("Connected to MongoDB successfully!");
            resolve();
          })
          .catch((err) => {
            console.error("Local database connection failed, falling back to cloud Atlas cluster...", err.message);
            mongoose
              .connect(CLOUD_DB, { serverSelectionTimeoutMS: 8000 })
              .then(() => {
                console.log("Connected to Cloud Atlas Database successfully!");
                resolve();
              })
              .catch((cloudErr) => {
                console.error("Cloud database connection also failed:", cloudErr.message);
                resolve(); // Resolve anyway so window still loads
              });
          });
      });

      httpServer.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          console.log(`Port ${PORT} is already in use by an active instance. Proceeding...`);
          isServerStarted = true;
          resolve();
        } else {
          console.error("Server error:", err);
          resolve();
        }
      });
    } catch (err) {
      console.error("Error setting up backend server:", err);
      resolve();
    }
  });
}

/**
 * Create the Main Application Window with Optimized Display
 */
function createMainWindow() {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
    return;
  }

  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  mainWindow = new BrowserWindow({
    width: Math.min(1440, width),
    height: Math.min(920, height),
    minWidth: 1024,
    minHeight: 700,
    center: true,
    show: false, // Prevent white flash on launch
    backgroundColor: '#0b0c0e', // Dark theme matching background
    autoHideMenuBar: true, // Clean modern UI without default menu bar
    title: "شطب",
    icon: path.join(__dirname, 'favicon.ico'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      sandbox: false,
      backgroundThrottling: false, // Maintain smooth performance in background
      spellcheck: false, // Save memory & CPU
      devTools: !app.isPackaged,
    },
  });

  mainWindow.setMenuBarVisibility(false);

  // Set high-res application icon
  const iconPath = path.join(__dirname, 'favicon.ico');
  if (fs.existsSync(iconPath)) {
    mainWindow.setIcon(iconPath);
  }

  // Dynamically synchronize the native Windows title bar with current page
  mainWindow.webContents.on('page-title-updated', (event, title) => {
    mainWindow.setTitle(title);
  });

  // Smooth appearance when content is ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.maximize();
    mainWindow.show();
    mainWindow.focus();
    console.log("Main window presented smoothly without white flash.");
  });

  // Handle external links (WhatsApp, Web URLs) by opening in default OS browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:') || url.startsWith('mailto:')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  // Load frontend
  const indexPath = path.join(__dirname, 'dist', 'index.html');
  if (fs.existsSync(indexPath)) {
    mainWindow.loadFile(indexPath);
  } else {
    console.error("index.html not found at:", indexPath);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Handle second instance attempt: focus current window
app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

// App Lifecycle
app.whenReady().then(async () => {
  await startBackendServer();
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (httpServer) {
    httpServer.close();
  }
  mongoose.disconnect();
});
