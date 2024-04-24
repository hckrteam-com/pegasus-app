const { app, BrowserWindow, screen, ipcRenderer } = require('electron');
const path = require('path');
const ioHook = require('iohook');

const iconPath = path.join(__dirname, "icons/pegasus.ico");


if (require('electron-squirrel-startup')) {
    app.quit();
}

const createWindow = () => {

    const mainWindow = new BrowserWindow({
        width: 350,
        height: 500,
        resizable: false,
        autoHideMenuBar: true,
        icon: iconPath,
        webPreferences: {
            "contextIsolation": false,
            "nodeIntegration": true
        },
    });

    // and load the index.html of the app.
    mainWindow.loadFile(path.join(__dirname, "./site/index.html"));
    // Open the DevTools.
    mainWindow.webContents.openDevTools({
        mode: "detach",
    });

    mainWindow.removeMenu()

    ioHook.on('keydown', (event) => {
        console.log(event.rawcode)
        if (event.rawcode === 164)
            mainWindow.webContents.send('pushToTalk', true);
    });

    ioHook.on('keyup', (event) => {
        if (event.rawcode === 164)
            mainWindow.webContents.send('pushToTalk', false);
    });

    ioHook.start();
};

app.whenReady().then(() => {
    createWindow();
    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
    ioHook.stop()
});