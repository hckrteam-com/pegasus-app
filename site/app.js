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
                mute = false
                break
            }
        }
        console.log('mute', mute)
        if (muteGain)
            muteGain.gain.value = mute ? 0 : 1;
    }, 1)

    if (localStorage.getItem("microphoneId")) {
        const microhponeId = localStorage.getItem("microphoneId")
        const microphone = await navigator.mediaDevices.getUserMedia({ "audio": { deviceId: microhponeId } })
        if (microphone) changeLocalStream(microphone)
    }

    const createPeer = () => {
        localPeer = new Peer({
            host: "167.235.229.141",
            port: "9876",
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

        gain.gain.value = 1;

        const source = audioContext.createMediaStreamSource(stream);

        const audio = document.createElement("video")
        audio.srcObject = source.mediaStream;

        source.connect(panner).connect(gain).connect(audioContext.destination);
        audioContext.resume();

        document.getElementById("audios").append(audio)
        calls[id].audio = audio;
    }

    const updateAudio = (id, position, muted, speakingChannel) => {
        console.log('updateAudio', id, position, muted, speakingChannel)
        if (calls[id] && calls[id].gain && calls[id].panner) {
            const call = calls[id]
            call.gain.gain.value = muted ? 0 : 1
            if (speakingChannel === "Proximity") {
                call.panner.positionX.setValueAtTime(position[0], audioContext.currentTime);
                call.panner.positionY.setValueAtTime(position[1], audioContext.currentTime);
                call.panner.positionZ.setValueAtTime(position[2], audioContext.currentTime);
            } else {
                call.panner.positionX.setValueAtTime(0, audioContext.currentTime);
                call.panner.positionY.setValueAtTime(0, audioContext.currentTime);
                call.panner.positionZ.setValueAtTime(0, audioContext.currentTime);
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

                const url = new URL("ws://167.235.229.141:3004")
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

                    if (data.type === "positions") {
                        showPage(vcPage)
                        for (let [peerId, { position, type, muted, speakingChannel }] of Object.entries(data.positions)) {
                            if (calls[peerId]) {
                                updateAudio(peerId, position, muted, speakingChannel)
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
        let channel;
        for (let child of document.getElementById("keybinds").childNodes) {
            if (child.classList.contains("talk")) { channel = child.id.replace("keybind-", "") }
        };
        if (socket && socket.readyState === WebSocket.OPEN)
            socket.send(channel)
    }, 100);
}

let startId = setInterval(() => {
    if (document.getElementById("robloxId").value > 0) {
        clearInterval(startId)
        main();
    }
}, 100)