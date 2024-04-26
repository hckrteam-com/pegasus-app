const { app, BrowserWindow, screen, ipcRenderer } = require('electron');
const path = require('path');
const ioHook = require("electron-iohook").default
const fetch = require('make-fetch-happen')

const iconPath = path.join(__dirname, "icons/pegasus.ico");

const urlProtocol = 'pegasus-app' // example:// 
if (process.defaultApp) {
    if (process.argv.length >= 2) {
        app.setAsDefaultProtocolClient(urlProtocol, process.execPath, [path.resolve(process.argv[1])])
    }
} else {
    app.setAsDefaultProtocolClient(urlProtocol)
}
const gotTheLock = app.requestSingleInstanceLock()

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
            "nodeIntegration": true,
            "additionalArguments": ['--use-fake-ui-for-media-stream']
        },
    });

    // and load the index.html of the app.
    mainWindow.loadFile(path.join(__dirname, "./site/index.html"));
    // Open the DevTools.
    mainWindow.webContents.openDevTools({
        mode: "detach",
    });

    mainWindow.removeMenu()

    if (!gotTheLock) {
        app.quit()
    } else {
        app.on('second-instance', async (event, commandLine, workingDirectory) => {
            let url = commandLine.pop().slice(0, -1)
            console.log(url)

            if (url.startsWith(urlProtocol + "://")) {
                let token = url.split(urlProtocol + "://")[1]

                mainWindow.webContents.send("token", token)

                app.focus()
                let req = await fetch(`https://api.hckrteam.com/v1/oauth/pegasus/dashboard`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                })

                // mainWindow.webContents.send("token", res.data.roblox_id)
                // let res = await req.json()
                // console.log(res)

                // if (res.success) {
                //     console.log("User is logged in")
                //     app.focus()
                //     mainWindow.webContents.send("robloxId", res.data.roblox_id)
                // } else {
                //     console.log("Invalid token")
                // }

            }

        })
    }

    ioHook.on('keydown', (event) => {
        mainWindow.webContents.send('keyPressed', [event.rawcode, true]);
    });

    ioHook.on('keyup', (event) => {
        mainWindow.webContents.send('keyPressed', [event.rawcode, false]);
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
    // ioHook.stop()
});