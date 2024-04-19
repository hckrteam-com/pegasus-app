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

        const stream = await getMicStream()
        const robloxId = parseInt(document.getElementById("robloxId").value)
        if (!stream) return console.log("Brak mikrofonu lub permisji do niego!")
        if (!robloxId) return

        // const peer = new Peer( {
        //     config: {
        //         iceServers: [
        //             {
        //                 urls: "stun:stun.l.google.com:19302",
        //             },
        //             {
        //                 url: "turn:numb.viagenie.ca",
        //                 credential: "muazkh",
        //                 username: "webrtc@live.com",
        //             },
        //         ],
        //     },
        // });
        const peer = new Peer();

        const calls = {}

        const createAudio = (id, stream) => {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)()
            const gain = new GainNode(audioContext)
            calls[id].gain = gain
            const panner = new PannerNode(audioContext, {
                panningModel: "HRTF",
                distanceModel: "linear",
                positionX: 100000000,
                positionY: 100000000,
                positionZ: 100000000,
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

            source = audioContext.createMediaStreamSource(stream);

            const audio = document.createElement("audio")
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

        peer.on("open", (peerId) => {
            console.log(peerId)

            const socket = new io("https://socket.pegasus.bot", {
                reconnection: false,
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


                socket.on("update-users", ({ usersData }) => {
                    console.log(usersData)
                    for (let [peerId, { position, callType }] of Object.entries(usersData)) {
                        if (calls[peerId]) {
                            updateAudio(peerId, position)
                        } else {
                            if (callType === "call") {
                                calls[peerId] = {}
                                const call = peer.call(peerId, stream)
                                call.on("stream", (otherStream) => {
                                    console.log('received call with stream', otherStream)
                                    calls[peerId].call = call;
                                    createAudio(peerId, otherStream)
                                })
                            }
                        }
                    }
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
            call.answer(stream)

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