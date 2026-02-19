const fs = require('fs');
const path = require('path');
fs.appendFileSync(path.join(process.cwd(), 'app.log'), 'main.bundle.js started\n');
const { app, BrowserWindow, screen } = require("electron/main");
const express = require("express");
const mongoose = require("mongoose");
const url = "mongodb://127.0.0.1:27017/finishes";
const newUrl = require("url");
const cors = require("cors");
// const livereload = require("livereload");
// const connectLivereload = require("connect-livereload");
// const path = require("path")
const bodyparser = require("body-parser");
// const fs = require("fs");

const logFile = fs.createWriteStream(path.join(process.cwd(), 'app.log'), { flags: 'a' });
const origConsoleLog = console.log;
console.log = function(...args) {
  const msg = args.map(a => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ');
  logFile.write(msg + '\n');
  origConsoleLog.apply(console, args);
};

function createWindow() {
  console.log("createWindow called");
  try {
    const size = screen.getPrimaryDisplay().workAreaSize;
    let win = new BrowserWindow({
      width: size.width,
      height: size.height,
      icon: `file://${__dirname}/favicon.ico`,
      fullscreenable: true,
      webPreferences: {
        nodeIntegration: true,
        preload: path.join(__dirname, "preload.js"),
        contextIsolation: true,
        enableRemoteModule: true,
        webviewTag: true,
        sandbox: false, // required for full DOM access in React
        devTools: true,
      },
    });
    
    const indexPath = path.join(__dirname, "dist", "index.html");
    if (fs.existsSync(indexPath)) {
      win.loadFile(indexPath);
      console.log('direname', __dirname);
      console.log('NODE_ENV:', process.env.NODE_ENV);
      
      // win.webContents.openDevTools(); // Uncomment for debugging
    } else {
      console.error("index.html not found at:", indexPath);
    }

    console.log(process.env.NODE_ENV);
    
    // Development-only tools
    if (process.env.NODE_ENV === 'development') {
      try {
        require("electron-reloader")(module);
        const livereload = require("livereload");
        const connectLivereload = require("connect-livereload");
        const liveReloadServer = livereload.createServer();
        liveReloadServer.watch(
          path.join(__dirname, "/dist", "index.html")
        );
        appExp.use(connectLivereload());
        liveReloadServer.server.once("connection", () => {
          setTimeout(() => {
            liveReloadServer.refresh("/");
          }, 100);
        });
      } catch (e) {
        console.log("Dev tools not loaded:", e);
      }
    }

try {
  
  win.setIcon(path.join(__dirname, "favicon.ico"));
  win.on("closed", function () {
    win = null;
  });
} catch (error) {
  console.log("Error in setIcon:", error.message);
  
}

    try {
      console.log("Before Express server setup");
      const appExp = express();
      console.log("Express app created");

      appExp.set("view engine", "ejs");
      console.log("View engine set");

      appExp.set("views", "views");
      console.log("Views set");

      appExp.use(bodyparser.json());
      console.log("Body parser set");

      appExp.use(cors());
      console.log("CORS set");

      const server = require("http").createServer(appExp);
      console.log("HTTP server created");

      appExp.use("/uploads", express.static("uploads"));
      console.log("Uploads static set");

      appExp.use(express.static(path.join(__dirname, "dist")));
      console.log("Dist static set");

      console.log("Loading route: ./routes/clientsRoutes");
      appExp.use('/api/client', require('./routes/clientsRoutes'));
      console.log("Loaded ./routes/clientsRoutes");

      appExp.use('/api/invoice', require('./routes/invoicesRoutes'));
      console.log("Loaded ./routes/invoicesRoutes");

      appExp.use('/api/accountStatement', require('./routes/accountStatementsRoutes'));
      console.log("Loaded ./routes/accountStatementsRoutes");

      appExp.use('/api/item', require('./routes/itemesRoutes'));
      console.log("Loaded ./routes/itemesRoutes");

      appExp.use('/api/apartment', require('./routes/apartmentsRoutes'));
      console.log("Loaded ./routes/apartmentsRoutes");

      const folderPath1 = path.join(__dirname, "uploads"); // Path to the folder
      if (fs.existsSync(folderPath1)) {
        console.log("Folder exists.");
      } else {
        console.log("Folder does not exist.");
        fs.mkdirSync(folderPath1, { recursive: true });
      }

      appExp.get("*", (req, res, next) => {
        res.sendFile(
          path.join(__dirname, "/dist", "index.html")
        );
      });

      server.listen(8081, () => {
        console.log("listening on port 8080");
        mongoose.connect(url).then((clientdb) => {
          console.log("connect to database");
        }).catch(err => {
          console.error("Database connection error:", err);
        });
      });
      server.on('error', (err) => {
        console.error("Server failed to start:", err);
      });
    } catch (err) {
      console.error("Error in Express server setup:", err);
    }
  } catch (err) {
    console.error("Error in createWindow:", err);
  }
}
// appExp.on("ready", createWindow);
app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

if (require("electron-squirrel-startup")) app.quit();

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
