const { app, BrowserWindow, systemPreferences, Notification, desktopCapturer } = require('electron');
const path = require('node:path');
const crypto = require('crypto');
const { autoUpdater, AppUpdater } = require("electron-updater");

// const RichPresence = require("rich-presence-builder")
// const express = require('express')
// const server = express();

const iconPath = path.join(__dirname, './icons/pegasus.ico');

autoUpdater.autoInstallOnAppQuit = true
autoUpdater.autoDownload = false

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

const createWindow = () => {

  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 350,
    height: 500,
    resizable: false,
    autoHideMenuBar: true,
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  const showMessage = (message) => {
    mainWindow.webContents.send("updateMessage", message)
  }

  // and load the index.html of the app.
  mainWindow.loadFile(path.join(__dirname, './site/index.html'));
  // Open the DevTools.
  mainWindow.webContents.openDevTools({
    "mode": "detach"
  });

  autoUpdater.on("checking-for-update", () => {
      showMessage("Checking for updates...")
  })

  autoUpdater.on("update-available", () => {
    showMessage("Update avaible.")
    autoUpdater.downloadUpdate().then((m) => {
      showMessage("downloaded", m)
    });
  })

  autoUpdater.on("update-downloaded", () => {
    showMessage("Update downloaded")
  })
  autoUpdater.on("download-progress", (info) => {
    showMessage("Download progress", info.percent)
  })

  autoUpdater.checkForUpdates()
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow();

  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.










































































// server.use(express.json())

// server.post('/api/rpc', async (req, res) => {

//   const { place_id } = req.body;

//   const clientid = "776903824567697478"

//   let largeimage = "placeholder_game_logo"
//   let smallimage = "icon-pegasus"
//   let state = "0 Players"
//   let details = "Playing Example Game"

//   if (largeimage === "placeholder_game_logo") {
//     smallimage = ""
//   }

//   let universe_id
//   let placeData

//   let gamename = ""
//   let players = 0
  
//   if (place_id) {
//     universe_id = await getUniverseId(place_id)
//     console.log(await universe_id)
//     placeData = await getPlaceData(universe_id)
//     console.log(await placeData)
//     await res.send({success: true, data: { universe_id, placeData }})

//     if (placeData.name.includes(']')) {
//       console.log(placeData.name)
//       gamename = placeData.name.split(']')[1]
//     }else{
//       gamename = placeData.name
//     }
//     players = placeData.playing

//     details = "Playing " + gamename
//     state = players.toString() + " Players"

//   }

//   new RichPresence({ clientID: clientid })
//   .setLargeImage(largeimage, "Pegasus Electron")
//   .setSmallImage(smallimage, "https://pegasus.bot")
//   .setState(state)
//   .setDetails(details)
//   // .setContextMenu([
//   //   {
//   //     label: "Join Game",
//   //     url: `https://www.roblox.com/games/${place_id}`
//   //   }
//   // ])
//   .setStartTimestamp(Date.now())
//   //.setEndTimestamp(Date.now() + 60000)
//   .addButton("Game", "roblox://placeId="+place_id.toString())
//   .addButton("Discord", "https://hckrteam.com")
//   .go()

//   const notif = new Notification({
//     icon: iconPath,
//     title: 'Pegasus System',
//     subtitle: 'Pegasus System',
//     body: 'Rich Presence has been started!',
//   });

//   notif.show()

// })


// server.listen(3000, () => {
//   console.log('Listening at http://localhost:3000')
// })

// async function getPlaceData(universe_id){
//   let response = fetch(`https://games.roblox.com/v1/games?universeIds=${universe_id}`)
//   .then(response => response.json())
//   .then(data => {
//     //console.log(data)
//     return data.data[0]
//   })
//   .catch(err => {
//     console.log(err)
//   })
//   return response
// }

// async function getUniverseId(place_id){
//   let response = await fetch(`https://apis.roblox.com/universes/v1/places/${place_id}/universe`)
//   .then(response => response.json())
//   .then(data => {
//     //console.log(data)
//     //console.log(data.universeId)
//     return data.universeId
//   })
//   .catch(err => {
//     console.log(err)
//   })
//   return response
// }
