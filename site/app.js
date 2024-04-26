import { Peer } from "https://esm.sh/peerjs@1.5.2?bundle-deps"
const main = async () => {
    const startPage = document.getElementById("startPage")
    const microphonePage = document.getElementById("microphonePage")
    const searchingPage = document.getElementById("searchingPage")
    const vcPage = document.getElementById("vcPage")

    let debounce = false;
    let robloxId
    let localStream
    let localPeer
    let socket
    let calls = {}
    let audioContext = new (window.AudioContext || window.webkitAudioContext)()

    const changeLocalStream = (stream) => {
        const source = audioContext.createMediaStreamSource(stream)

        // // Create noise gate with adjustable parameters
        // const noiseGate = audioContext.createDynamicsCompressor();
        // noiseGate.threshold.setValueAtTime(-50, audioContext.currentTime); // Adjust threshold as needed
        // noiseGate.ratio.setValueAtTime(20, audioContext.currentTime); // Adjust ratio as needed

        // // Create dynamic compressor with adjustable parameters
        // const compressor = audioContext.createDynamicsCompressor();
        // compressor.attack.setValueAtTime(0.003, audioContext.currentTime);
        // compressor.release.setValueAtTime(0.25, audioContext.currentTime);
        // compressor.ratio.setValueAtTime(10, audioContext.currentTime); // Adjust ratio as needed
        // compressor.threshold.setValueAtTime(-10, audioContext.currentTime); // Adjust threshold as needed

        const destination = audioContext.createMediaStreamDestination();
        // source.connect(noiseGate).connect(compressor).connect(destination);

        localStream = destination.stream

    }

    document.getElementById("pushToTalk").onchange = () => {
        console.log(!document.getElementById("pushToTalk").checked)
        document.getElementById("mic").hidden = !document.getElementById("pushToTalk").checked
    }

    if (localStorage.getItem("robloxId")) {
        robloxId = localStorage.getItem("robloxId")
        document.getElementById("robloxId").value = robloxId
    }

    if (localStorage.getItem("microphoneId")) {
        const microhponeId = localStorage.getItem("microphoneId")
        const microphone = await navigator.mediaDevices.getUserMedia({ "audio": { deviceId: microhponeId } })
        if (microphone) changeLocalStream(microphone)
    }


    const createPeer = () => {
        const peer = new Peer({
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

        peer.on("open", () => {
            localPeer = peer;
            showPage(searchingPage);

            peer.on("call", (call) => {
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
        peer.on("error", (err) => {
            console.log(err)
            for (let callId of Object.keys(calls)) {
                removeAudio(callId)
            }
            document.getElementById("audios").innerHTML = ""
            showPage()
            reset()
        })
    }


    const showPage = (page) => {
        startPage.hidden = page == startPage ? false : true
        microphonePage.hidden = page == microphonePage ? false : true
        searchingPage.hidden = page == searchingPage ? false : true
        vcPage.hidden = page == vcPage ? false : true
    };

    if (robloxId && localStream) {
        showPage(searchingPage)
        createPeer();
    } else {
        showPage(startPage);
    }

    const reset = () => {
        debounce = false;
        robloxId = undefined
        localStream = undefined
        if (localPeer) localPeer.disconnect()
        localPeer = undefined
        if (socket) socket.close()
        socket = undefined
        document.getElementById("audios").innerHTML = ""
        document.getElementById("localStream").muted = true
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

    const updateAudio = (id, position) => {
        if (calls[id] && calls[id].gain && calls[id].panner) {
            //update
            calls[id].panner.positionX.setValueAtTime(position[0], audioContext.currentTime);
            calls[id].panner.positionY.setValueAtTime(position[1], audioContext.currentTime);
            calls[id].panner.positionZ.setValueAtTime(position[2], audioContext.currentTime);
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

    document.getElementById("start").onclick = async () => {
        if (debounce) return;
        debounce = true

        if (parseInt(document.getElementById("robloxId").value)) {
            robloxId = parseInt(document.getElementById("robloxId").value)
            localStorage.setItem("robloxId", robloxId)
        } else {
            debounce = false
            return
        }

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

        if (localStorage.getItem("microphoneId") && microphones.find(v => v[1] === localStorage.getItem("microphoneId"))) {
            document.getElementById("microphones").value = localStorage.getItem("microphoneId")
            document.getElementById("microphoneContinue").hidden = false
            document.getElementById("microphoneTest").hidden = false
        }

        document.getElementById("microphones").onchange = async () => {
            const deviceId = document.getElementById("microphones").value
            document.getElementById("microphoneContinue").hidden = !(deviceId.length > 0)
            document.getElementById("microphoneTest").hidden = !(deviceId.length > 0)
            document.getElementById("localStream").muted = true;

            localStorage.setItem("microphoneId", deviceId.length > 0 ? deviceId : null)
        }

        showPage(microphonePage)
        debounce = false
    };


    document.getElementById("config").onclick = () => {
        const robloxIdBackup = robloxId
        reset();
        robloxId = robloxIdBackup
        showPage(startPage)
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
                    document.getElementById("localStream").muted = !document.getElementById("localStream").muted;
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
                    document.getElementById("localStream").muted = true;

                    const peer = new Peer({
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

                    //

                    peer.on("open", () => {
                        console.log("connected to peer", peer.id)
                        localPeer = peer;
                        showPage(searchingPage);

                        peer.on("call", (call) => {
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
                    peer.on("error", (err) => {
                        console.log(err)
                        for (let callId of Object.keys(calls)) {
                            removeAudio(callId)
                        }
                        document.getElementById("audios").innerHTML = ""
                        showPage()
                        reset()
                    })
                    return

                }
            } catch { };

        };
        debounce = false;
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
                    showPage(vcPage)
                    for (let [peerId, { position, type }] of Object.entries(data)) {
                        if (calls[peerId]) {
                            updateAudio(peerId, position)
                        } else if (!calls[peerId] && type === "call") {
                            console.log('call someone')
                            calls[peerId] = {}
                            const call = localPeer.call(peerId, localStream)
                            call.on("stream", (otherStream) => {
                                console.log('received call with stream', otherStream)
                                calls[peerId].call = call;
                                createAudio(peerId, otherStream)
                            })
                        }
                    }
                });

                ws.addEventListener("close", () => {
                    socket = undefined
                    console.log('connection to socket lost')
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
        if (socket && socket.readyState === WebSocket.OPEN)
            socket.send("active")
    }, 100);
}

main();