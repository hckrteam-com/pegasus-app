import { Peer } from "https://esm.sh/peerjs@1.5.2?bundle-deps"

const main = async () => {
    const startPage = document.getElementById("startPage")
    const microphonePage = document.getElementById("microphonePage")
    const searchingPage = document.getElementById("searchingPage")
    const vcPage = document.getElementById("vcPage")

    let debounce = false;
    let robloxId = parseInt(document.getElementById("robloxId").value)
    let localStream
    let localPeer
    let socket
    let calls = {}
    let audioContext = new (window.AudioContext || window.webkitAudioContext)()
    let muteGain
    let avaibleKeybindedChannels = []
    let avaibleCustomChannels = []

    const changeLocalStream = (stream) => {
        const source = audioContext.createMediaStreamSource(stream)

        muteGain = audioContext.createGain();
        muteGain.gain.value = 1

        // TODO: 
        // let noiseGate = new NoiseGateNode(audioContext);

        const destination = audioContext.createMediaStreamDestination();
        source.connect(muteGain).connect(destination);

        localStream = destination.stream
    }

    setInterval(() => {
        let mute = true
        for (let child of document.getElementById("keybinds").childNodes) {
            if (child.classList.contains("talk")) {
                const channelName = child.id.replace("keybind-", "")
                if (avaibleKeybindedChannels.find(v => v === channelName) || channelName === "Proximity") {
                    mute = false
                    break
                }
            }
        }
        if (muteGain)
            muteGain.gain.value = mute ? 0 : 1;
    }, 10)

    if (localStorage.getItem("microphoneId")) {
        const microhponeId = localStorage.getItem("microphoneId")
        const microphone = await navigator.mediaDevices.getUserMedia({ "audio": { deviceId: microhponeId } })
        if (microphone) changeLocalStream(microphone)
    }

    const createPeer = () => {
        localPeer = new Peer({
            // host: "167.235.229.141",
            // port: "9876",
            host: "peer.pegasus.bot",
            port: "80",
            ssl: false,
            config: {
                iceServers: [
                    {
                        url: 'stun:nl-coturn.hckrteam.com:3478',
                        urls: 'stun:nl-coturn.hckrteam.com:3478'
                    },
                    {
                        url: "turn:nl-coturn.hckrteam.com:3478?transport=udp",
                        urls: "turn:nl-coturn.hckrteam.com:3478?transport=udp",
                        username: "admin",
                        credential: "admin",
                    },
                    {
                        url: "turn:nl-coturn.hckrteam.com:3478?transport=tcp",
                        urls: "turn:nl-coturn.hckrteam.com:3478?transport=tcp",
                        username: "admin",
                        credential: "admin",
                    }
                ],
            },
        });

        localPeer.on("open", () => {
            if (!localPeer) return
            showPage(searchingPage);

            localPeer.on("call", (call) => {
                call.answer(localStream)

                call.on("stream", (otherStream) => {
                    console.log('received call with stream', otherStream)
                    calls[call.peer] = {
                        call,
                    }
                    createAudio(call.peer, otherStream)
                });
                call.on("close", () => {
                    removeAudio(call.peer)
                })
            })
        })
        localPeer.on("error", (err) => {
            console.log(err)
            for (let callId of Object.keys(calls)) {
                removeAudio(callId)
            }
            document.getElementById("audios").innerHTML = ""
            reset()
            start()
        })
    }


    const showPage = (page) => {
        startPage.hidden = page == startPage ? false : true
        microphonePage.hidden = page == microphonePage ? false : true
        searchingPage.hidden = page == searchingPage ? false : true
        vcPage.hidden = page == vcPage ? false : true
    };

    const reset = () => {
        debounce = false;
        if (localPeer) localPeer.disconnect()
        localPeer = undefined
        if (socket) socket.close()
        socket = undefined
        document.getElementById("audios").innerHTML = ""
        muteLocalStream(true)
        calls = {}
    }

    const createAudio = (id, stream) => {
        console.log('createAudio', id, stream)
        const gain = new GainNode(audioContext)
        calls[id].gain = gain
        const panner = new PannerNode(audioContext, {
            panningModel: "HRTF",
            distanceModel: "linear",
            positionX: 1000000,
            positionY: 1000000,
            positionZ: 1000000,
            orientationX: 0,
            orientationY: 0,
            orientationZ: -1,
            refDistance: 1,
            maxDistance: 100,
            rolloffFactor: 20,
            coneInnerAngle: 40,
            coneOuterAngle: 50,
            coneOuterGain: 0.4,
        })
        calls[id].panner = panner

        // telephonizer
        var lpf1 = audioContext.createBiquadFilter();
        lpf1.type = "allpass";
        lpf1.frequency.value = 2000.0;
        var lpf2 = audioContext.createBiquadFilter();
        lpf2.type = "allpass";
        lpf2.frequency.value = 2000.0;
        var hpf1 = audioContext.createBiquadFilter();
        hpf1.type = "allpass";
        hpf1.frequency.value = 500.0;
        var hpf2 = audioContext.createBiquadFilter();
        hpf2.type = "allpass";
        hpf2.frequency.value = 500.0;

        calls[id].telephone = (state) => {
            if (state) {
                lpf1.type = "lowpass"
                lpf2.type = "lowpass"
                hpf1.type = "highpass"
                hpf2.type = "highpass"
            } else {
                lpf1.type = "allpass"
                lpf2.type = "allpass"
                hpf1.type = "allpass"
                hpf2.type = "allpass"
            }
        }

        gain.gain.value = 1;

        const source = audioContext.createMediaStreamSource(stream);

        const audio = document.createElement("video")
        audio.srcObject = source.mediaStream;

        source.connect(panner).connect(gain).connect(lpf1).connect(lpf2).connect(hpf1).connect(hpf2).connect(audioContext.destination);
        audioContext.resume();

        document.getElementById("audios").append(audio)
        calls[id].audio = audio;
    }

    const updateAudio = (id, position, speakingChannels) => {
        console.log('updateAudio', id, position, speakingChannels)
        if (calls[id] && calls[id].gain && calls[id].panner) {
            const call = calls[id]
            if (speakingChannels.length === 0) {
                call.gain.gain.value = 0
            } else {
                let inChannelWithHim = false
                for (let channel of avaibleKeybindedChannels) {
                    if (speakingChannels.find(v => v === channel)) {
                        inChannelWithHim = true
                        break
                    }
                }
                for (let [channel] of Object.entries(avaibleCustomChannels)) {
                    if (speakingChannels.find(v => v === channel)) {
                        inChannelWithHim = true
                        break
                    }
                }

                call.gain.gain.value = 1
                if (inChannelWithHim) {
                    call.telephone(true)

                    call.panner.positionX.setValueAtTime(0, audioContext.currentTime);
                    call.panner.positionY.setValueAtTime(0, audioContext.currentTime);
                    call.panner.positionZ.setValueAtTime(0, audioContext.currentTime);
                } else {
                    call.telephone(false)

                    call.panner.positionX.setValueAtTime(position[0], audioContext.currentTime);
                    call.panner.positionY.setValueAtTime(position[1], audioContext.currentTime);
                    call.panner.positionZ.setValueAtTime(position[2], audioContext.currentTime);
                }
            }
        }
    }

    const muteLocalStream = (status) => {
        document.getElementById("localStream").muted = status
        if (document.getElementById("localStream").muted) {
            document.getElementById("microphoneTest").innerHTML = "Testuj mikrofon"
        } else {
            document.getElementById("microphoneTest").innerHTML = "Przestań testować"
        }
    }

    const removeAudio = (id) => {
        if (calls[id]) {
            if (calls[id].audio) {
                calls[id].audio.remove()
            }
            calls[id].call.close()
            delete calls[id]
        }
    }


    // create microphones list
    let microphones = [[""]]
    const devices = await navigator.mediaDevices.enumerateDevices()

    devices.forEach((device) => {
        if (device.kind === "audioinput") {
            microphones.push([device.label, device.deviceId])
        }
    })

    document.getElementById("microphones").innerHTML = ""
    microphones.forEach((microphone) => {
        const option = document.createElement('option');
        if (microphone[1])
            option.value = microphone[1]
        option.text = microphone[0] || "";
        document.getElementById("microphones").appendChild(option)
    })

    document.getElementById("microphones").onchange = async () => {
        const deviceId = document.getElementById("microphones").value
        document.getElementById("microphoneContinue").hidden = !(deviceId.length > 0)
        document.getElementById("microphoneTest").hidden = !(deviceId.length > 0)
        muteLocalStream(true)

        localStorage.setItem("microphoneId", deviceId.length > 0 ? deviceId : null)
    }

    if (localStorage.getItem("microphoneId") && microphones.find(v => v[1] === localStorage.getItem("microphoneId"))) {
        document.getElementById("microphones").value = localStorage.getItem("microphoneId")
        document.getElementById("microphoneContinue").hidden = false
        document.getElementById("microphoneTest").hidden = false
    }

    const start = async () => {
        if (localStream) {
            showPage(searchingPage)
            createPeer();
        } else {
            showPage(microphonePage);
        }
    }
    start()


    document.getElementById("config").onclick = () => {
        const robloxIdBackup = robloxId
        reset();
        robloxId = robloxIdBackup
        showPage(microphonePage)
    }

    document.getElementById("microphoneTest").onclick = async () => {
        if (debounce) return
        debounce = true
        const deviceId = document.getElementById("microphones").value
        if (deviceId.length > 0) {
            try {
                const device = await navigator.mediaDevices.getUserMedia({ audio: { deviceId: deviceId } })
                if (device) {
                    changeLocalStream(device)
                    document.getElementById("localStream").srcObject = localStream;
                    muteLocalStream(!document.getElementById("localStream").muted)
                }
            } catch { };

        };
        debounce = false;
    }

    document.getElementById("microphoneContinue").onclick = async () => {
        if (debounce) return
        debounce = true
        const deviceId = document.getElementById("microphones").value
        if (deviceId.length > 0) {
            try {
                const device = await navigator.mediaDevices.getUserMedia({ audio: { deviceId: deviceId } })
                if (device) {
                    changeLocalStream(device)
                    muteLocalStream(true)

                    createPeer()
                }
            } catch { };

        };
        debounce = false;
    }

    document.onkeydown = (event) => {
        for (let child of document.getElementById("keybinds").childNodes)
            if (parseInt(child.value) === parseInt(event.which))
                child.classList.add("talk")
    }

    document.onkeyup = (event) => {
        for (let child of document.getElementById("keybinds").childNodes)
            if (parseInt(child.value) === parseInt(event.which))
                child.classList.remove("talk")
    }

    setInterval(() => {
        if (!searchingPage.hidden && localPeer) {
            if (!socket) {

                const url = new URL("wss://socket.pegasus.bot")
                url.search = new URLSearchParams({
                    robloxId,
                    peerId: localPeer.id
                })
                console.log(url.toString())
                const ws = new WebSocket(url.toString())

                ws.addEventListener("open", () => {
                    console.log("WS connected")
                    socket = ws

                })

                ws.addEventListener("message", (message) => {
                    const data = JSON.parse(message.data)
                    console.log(data)

                    if (data.placeId) {
                        //actualPlaceId = data.placeId
                        updatePlaceId(data.placeId)
                    }

                    if (data.type === "positions") {
                        showPage(vcPage)
                        for (let [peerId, { position, type, speakingChannels }] of Object.entries(data.positions)) {
                            if (calls[peerId]) {
                                updateAudio(peerId, position, speakingChannels)
                            } else if (!calls[peerId] && type === "call") {
                                console.log('call someone')
                                calls[peerId] = {}
                                const call = localPeer.call(peerId, localStream)
                                call.on("stream", (otherStream) => {
                                    console.log('received call with stream', otherStream)
                                    calls[peerId].call = call;
                                    createAudio(peerId, otherStream)
                                })
                                call.on("close", () => {
                                    removeAudio(call.peer)
                                })
                            }
                        }
                        for (let [peerId, callData] of Object.entries(calls)) {
                            if (!Object.keys(data.positions).find(v => v === peerId)) {
                                callData.call.close()
                            }
                        }

                        if (data.keybinds) {
                            for (let [channel, keybind] of Object.entries(data.keybinds)) {
                                if (document.getElementById(`keybind-${channel}`)) {
                                    document.getElementById(`keybind-${channel}`).value = keybind
                                } else {
                                    const input = document.createElement("input")
                                    input.hidden = true
                                    input.id = `keybind-${channel}`
                                    input.type = "number"
                                    input.value = keybind
                                    document.getElementById("keybinds").append(input)
                                }
                            }
                        }
                        if (data.keybindedChannels) {
                            avaibleKeybindedChannels = data.keybindedChannels
                        }
                        if (data.customChannels) {
                            avaibleCustomChannels = data.customChannels
                        }
                    }
                });

                ws.addEventListener("close", () => {
                    socket = undefined
                    console.log('connection to socket lost')
                    if (!vcPage.hidden)
                        showPage(searchingPage)
                })
                ws.addEventListener("error", (err) => {
                    socket = undefined
                    console.log("ws error", err)
                })
            }
        }
    }, 5000);
    setInterval(() => {
        let channelName;
        for (let child of document.getElementById("keybinds").childNodes) {
            if (child.classList.contains("talk")) {
                const _channelName = child.id.replace("keybind-", "")
                if (avaibleKeybindedChannels.find(v => v === _channelName) || _channelName === "Proximity") {
                    channelName = _channelName
                }
            }
        };
        if (socket && socket.readyState === WebSocket.OPEN) {
            console.log(channelName)
            socket.send(channelName)
        }
    }, 10);
}

let startId = setInterval(() => {
    if (document.getElementById("robloxId").value > 0) {
        clearInterval(startId)
        main();
    }
}, 100)



let actualPlaceId = ""
let actualUniverseId = ""

async function updatePlaceId(placeId) {
    console.log(placeId)
    if (actualPlaceId !== placeId) {
        actualPlaceId = placeId

        console.log('updatePlaceId', placeId)
        if (!placeId) return updateRPC(false)

        let universeId = await getUniverseId(placeId)
        if (!universeId) return

        actualUniverseId = universeId
        console.log('updateUniverseId', universeId)

        let placeData = await getPlaceData(universeId)
        if (!placeData) return

        console.log('updatePlaceData', placeData)

        updateRPC(placeData)

    }
}

async function getUniverseId(place_id) {
    let response = await fetch(`https://apis.roblox.com/universes/v1/places/${place_id}/universe`)
        .then(response => response.json())
        .then(data => {

            if (!data) return false
            if (!data.universeId) return false

            return data.universeId
        })
        .catch(err => {
            console.log(err)
        })
    return response
}


async function getPlaceData(universe_id) {
    let response = fetch(`https://games.roblox.com/v1/games?universeIds=${universe_id}`)
        .then(response => response.json())
        .then(data => {
            //console.log(data)
            return data.data[0]
        })
        .catch(err => {
            console.log(err)
        })
    return response
}


async function updateRPC(placeData) {

    const result = await fetch('http://localhost:4582/api/rpc', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            placeData
        })
    }).then((res) => res.json())
    console.log(result)
    if (result.success == true) {

    } else {
        alert(result.error)
    }
}