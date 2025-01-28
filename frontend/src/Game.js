import React, { useEffect, useState, useRef } from "react";
import socket from "./socket";
import { useLocation, useNavigate } from "react-router-dom";
import "./Game.css";

const Game = () => {
    const location = useLocation();
    const { name, gameSettings, players } = location.state || {};
    const [timer, setTimer] = useState(gameSettings.timer);
    const roundTime = gameSettings.timer;
    const [round, setRound] = useState(gameSettings.rounds);
    const [deathLog, setDeathLog] = useState([]);
    const [currentPlayers, setPlayers] = useState(players);
    const [videoList, setVideoList] = useState([]);
    const [currentVideoUrl, setCurrentVideoUrl] = useState("");
    const videoRef = useRef(null);
    const navigate = useNavigate();

    useEffect(() => {
        // Fetch video list from the backend
        const fetchVideos = async () => {
            try {
                const response = await fetch("http://127.0.0.1:8000/fetch_videos");
                const data = await response.json();
                if (data.success) {
                    setVideoList(data.videos);
                    setCurrentVideoUrl(data.videos[0]); // Set the first video as the default
                } else {
                    console.error("Error fetching videos:", data.error);
                }
            } catch (error) {
                console.error("Error:", error);
            }
        };

        fetchVideos();
    }, []);

    const changeVideo = () => {
        if (videoList.length > 0) {
            const nextVideoIndex =
                (videoList.indexOf(currentVideoUrl) + 1) % videoList.length;
            setCurrentVideoUrl(videoList[nextVideoIndex]);
        }
    };

    useEffect(() => {
        console.log(socket.id);
        // Listen for players joining
        socket.on("playerJoined", (player) => {
            setPlayers((prev) => [...prev, player.name]);
            console.log(`Game display: player joined: ${player.name}`);
        });

        // Listen for players leaving
        socket.on("playerLeft", (player) => {
            setPlayers((prev) => prev.filter((p) => p.id !== player.id));
            console.log(`Player left: ${player.name}`);
        });

        // Cleanup on unmount
        return () => {
            socket.off("playerJoined");
            socket.off("playerLeft");
        };
    }, []);

    // Countdown timer effect
    useEffect(() => {
        if (timer > 0) {
            const countdown = setInterval(
                () => setTimer((prev) => Math.max(prev - 1, 0)),
                1000
            );
            return () => clearInterval(countdown);
        } else {
            changeVideo();
            setTimer(roundTime);
            setRound((prevRound) => prevRound - 1);
        }
    }, [timer, round, roundTime]);

    const handlePlayerDeath = (playerName) => {
        setDeathLog((prevLog) => [...prevLog, `${playerName} has died.`]);
    };

    // capture and send frame to python server
    const captureAndSendFrame = async () => {
        const videoElement = videoRef.current;
    
        if (videoElement && videoElement.videoWidth > 0 && videoElement.videoHeight > 0) {
            const canvas = document.createElement("canvas");
            canvas.width = videoElement.videoWidth;
            canvas.height = videoElement.videoHeight;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
            canvas.toBlob((blob) => {
                if (blob) {
                    const lobbyCode = new URLSearchParams(location.search).get("lobby"); // Fixed this line
                    socket.emit("webcam_data", {
                        image: blob,
                        lobbyCode,
                    });
                }
              }, 'image/jpeg', 0.7); // Adjust the quality as needed (0.7 = 70% quality)
            
        } else {
            console.log("Video element not ready yet.");
        }
    };

    useEffect(() => {
        const startWebcam = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            } catch (error) {
                console.error("Error accessing webcam:", error);
            }
        };

        startWebcam();

        const intervalId = setInterval(captureAndSendFrame, 125);

        socket.on("webcam_response", (message) => {
            if (message.message === "roundLost") {
                navigate("/lost");
            }
        });

        return () => {
            clearInterval(intervalId);
            if (videoRef.current && videoRef.current.srcObject) {
                videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
            }
        };
    }, []);

    return (
        <div className="game-container">
            <div className="top-bar">
                <h1 className="game-title">
                    krackle.io <span className="emoji">😂</span>
                </h1>
                <div className="game-info">
                    <p>Timer: {timer}s</p>
                    <p>Round: {round}</p>
                </div>
            </div>

            <div className="main-content">
                <div className="player-list">
                    <h2>Players</h2>
                    <div className="player-icons">
                        {currentPlayers.map((player, index) => (
                            <div key={index} className="player-box">
                                <span className="player-name">{player}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="main-video-container">
                    <div className="video-container">
                        {currentVideoUrl ? (
                            <iframe
                                className="youtube-iframe"
                                src={currentVideoUrl}
                                title="YouTube video player"
                                frameBorder="0"
                                allow="autoplay; encrypted-media"
                                allowFullScreen={false}
                            ></iframe>
                        ) : (
                            <p>Loading videos...</p>
                        )}
                    </div>
                </div>

                <div className="death-log">
                    <h2>Death Log</h2>
                    <ul>
                        {deathLog.map((log, index) => (
                            <li key={index}>{log}</li>
                        ))}
                    </ul>
                </div>
            </div>

            <video ref={videoRef} id="webcam" autoPlay playsInline muted className="webcam-video"></video>
        </div>
    );
};

export default Game;
