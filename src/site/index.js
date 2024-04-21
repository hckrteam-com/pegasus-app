import { io } from "https://cdn.socket.io/4.7.5/socket.io.esm.min.js";
import { Peer } from "https://esm.sh/peerjs@1.5.2?bundle-deps"

const getMicStream = () => {
    const promise = new Promise((res, rej) => {
        navigator.mediaDevices
            .getUserMedia({
                video: false,
                audio: true,
            })
            .then((stream) => {
                res(stream);
            })
            .catch((error) => {
                rej(error);
            });
    });
    return promise;
};

const main = async () => {

    document.getElementById("start").onclick = async () => {

        const localStream = await getMicStream()
        const robloxId = parseInt(document.getElementById("robloxId").value)
        if (!localStream) return console.log("Brak mikrofonu lub permisji do niego!")
        if (!robloxId) return

        navigator.mediaDevices.enumerateDevices().then(devices => {
            devices.forEach((device) => {
                if (device.kind === "audioinput") {
                    console.log(device)
                }
            })
        })

        const peer = new Peer({
            host: "167.235.229.141",
            port: "9876",
            ssl: false,
            config: {
                iceServers: [
                    {
                        url: 'stun:global.stun.twilio.com:3478',
                        urls: 'stun:global.stun.twilio.com:3478'
                    },
                    {
                        url: 'turn:global.turn.twilio.com:3478?transport=udp',
                        username: 'e0bad77d18410399ce5af94ec177d0f1dcd821734d816f39bc650734990c2122',
                        urls: 'turn:global.turn.twilio.com:3478?transport=udp',
                        credential: 'RSCqxdrY3fpiIVv4t9113OBHBHSnNf48Enu53uDWK6o='
                    },
                    {
                        url: 'turn:global.turn.twilio.com:3478?transport=tcp',
                        username: 'e0bad77d18410399ce5af94ec177d0f1dcd821734d816f39bc650734990c2122',
                        urls: 'turn:global.turn.twilio.com:3478?transport=tcp',
                        credential: 'RSCqxdrY3fpiIVv4t9113OBHBHSnNf48Enu53uDWK6o='
                    },
                    {
                        url: 'turn:global.turn.twilio.com:443?transport=tcp',
                        username: 'e0bad77d18410399ce5af94ec177d0f1dcd821734d816f39bc650734990c2122',
                        urls: 'turn:global.turn.twilio.com:443?transport=tcp',
                        credential: 'RSCqxdrY3fpiIVv4t9113OBHBHSnNf48Enu53uDWK6o='
                    }
                ],
            },
        });

        const calls = {}

        const audioContext = new (window.AudioContext || window.webkitAudioContext)()
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

            document.body.append(audio)
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

        peer.on("error", (err) => {
            console.error(err)
        })

        peer.on("open", (peerId) => {
            console.log(peerId)

            const socket = new io("https://socket.pegasus.bot", {
                reconnect: false,
                query: {
                    peer_id: peerId,
                    roblox_id: robloxId,
                },
            });


            socket.on("connect", () => {
                console.log('connected', peer)

                setInterval(() => {
                    socket.emit("active");
                }, 500);


                socket.on("update-users", ({ usersData }, ackFn) => {
                    console.log(usersData)
                    for (let [peerId, { position, type }] of Object.entries(usersData)) {
                        if (calls[peerId]) {
                            updateAudio(peerId, position)
                        } else if (!calls[peerId] && type === "call") {
                            console.log('call someone')
                            calls[peerId] = {}
                            const call = peer.call(peerId, localStream)
                            call.on("stream", (otherStream) => {
                                console.log('received call with stream', otherStream)
                                calls[peerId].call = call;
                                createAudio(peerId, otherStream)
                            })
                        }
                    }
                    ackFn(true);
                });
            })
            socket.on("connect_error", (err) => {
                console.log("connect_error", err)
            })
            socket.on("disconnect", () => {
                console.log("disconnect")
            })
        })

        peer.on("call", (call) => {
            console.log("received call")
            call.answer(localStream)

            call.on("stream", (otherStream) => {
                console.log('received call with stream', otherStream)
                calls[call.peer] = {
                    call,
                }
                createAudio(call.peer, otherStream)
            });
        })


    }
}

main()