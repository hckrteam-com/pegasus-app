const { app, BrowserWindow, screen, ipcRenderer, desktopCapturer } = require('electron');
const path = require('path');
const ioHook = require("electron-iohook").default
const fetch = require('make-fetch-happen')

//me
const RichPresence = require("rich-presence-builder")
const express = require('express')
const server = express();

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






const clientid = "776903824567697478"
const RPC = new RichPresence({ clientID: clientid })

server.use(express.json())

server.post('/api/rpc', async (req, res) => {

  const { placeData } = req.body;

  if(!placeData) return await RPC.clear()


  let largeimage = "placeholder_game_logo"
  let smallimage = "icon-pegasus"
  let state = "0 Players"
  let details = "Playing Example Game"

  if (largeimage === "placeholder_game_logo") {
    smallimage = ""
  }

  let universe_id

  let gamename = ""
  let players = 0
  
  if (placeData) {
    console.log(await placeData)
    await res.send({success: true, data: { universe_id, placeData }})

    if (placeData.name.includes(']')) {
      console.log(placeData.name)
      gamename = placeData.name.split(']')[1]
    }else{
      gamename = placeData.name
    }
    players = placeData.playing

    if(players == 0){
        players = 1
    }

    details = "Playing " + gamename
    state = players.toString() + " Players"
  }

  RPC.setLargeImage(largeimage, "pegasus.bot")
  RPC.setSmallImage(smallimage, "https://pegasus.bot")
  RPC.setState(state)
  RPC.setDetails(details)
  RPC.setStartTimestamp(Date.now())
  RPC.addButton("Game", "roblox://placeId="+placeData.id.toString())
  RPC.addButton("Discord", "https://hckrteam.com")
  RPC.go()

})


server.listen(3000, () => {
    console.log('Listening at http://localhost:3000')
  })
  