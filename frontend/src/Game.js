import React, { useEffect, useState, useRef } from "react";
import socket from "./socket";
import { useLocation, useNavigate, } from "react-router-dom";
import "./Game.css";
import GameStartingLoading from './GameStartingLoading';
import Lost from './Lost';
import * as faceapi from '@vladmandic/face-api';

const Game = () => {
    const location = useLocation();
    const { name, gameSettings, players } = location.state || {};
    const [timer, setTimer] = useState(gameSettings.timer);
    const [showCountdown, setShowCountdown] = useState(true);
    const roundTime = gameSettings.timer;
    const [round, setRound] = useState(gameSettings.rounds);
    const [deathLog, setDeathLog] = useState([]);
    const [currentPlayers, setPlayers] = useState(players);
    const [videoList, setVideoList] = useState([]);
    const [currentVideoUrl, setCurrentVideoUrl] = useState("");
    const [gameStartingLoading, setLoading] = useState(true);
    const [lost, setLost] = useState(false);
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const params = new URLSearchParams(location.search);
    const lobby = params.get('lobby');


    function sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    useEffect(() => {
        // Load the model and cascade classifier when the component mounts
        const loadModel = async () => {
            const modelUrl = process.env.PUBLIC_URL + '/models';
            await faceapi.nets.tinyFaceDetector.loadFromUri(modelUrl);
            await faceapi.nets.faceExpressionNet.loadFromUri(modelUrl);
            sleep(500);
        };
        loadModel();
    }, []);

    const handleCountdownEnd = () => {
        setShowCountdown(false);
    };

    useEffect(() => {
        // Fetch video list from the backend
        const fetchVideos = async () => {
            try {
                const response = await fetch(`${process.env.REACT_APP_SERVER_URL}/fetch_videos`);
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
        // Listen for players joining
        socket.on("playerJoined", (player) => {
            setPlayers((prev) => [...prev, player]);
            console.log(`Game display: player joined: ${player.name}`);
        });

        socket.on("playerSmiled", (player) => {
            console.log(`Player smiled: ${player.name}`);
        });

        socket.on("gameOver", (data) => {
            console.log("Game over, received statistics:", data.statistics);
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
            const countdown = setInterval(() => 
                setTimer((prev) => Math.max(prev - 1, 0)),
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

    useEffect(() => {
        const startWebcam = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ 
                    video: {
                        width: { ideal: 640 },
                        height: { ideal: 480 }
                    } 
                });
                
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    
                    // Initialize canvas once video metadata is loaded
                    videoRef.current.onloadedmetadata = () => {
                        if (canvasRef.current) {
                            canvasRef.current.width = videoRef.current.videoWidth;
                            canvasRef.current.height = videoRef.current.videoHeight;
                        }
                    };
                }
            } catch (error) {
                console.error("Error accessing webcam:", error);
            }
        };
        startWebcam();
        setLoading(false);

        const intervalId = setInterval(captureAndSendFrame, 125);

        return () => {
            clearInterval(intervalId);
            if (videoRef.current && videoRef.current.srcObject) {
                videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
            }
        };
    }, []);

    // Modify captureAndSendFrame to use local emotion detection
    const captureAndSendFrame = async () => {  
        if (!videoRef.current || videoRef.current.readyState < videoRef.current.HAVE_ENOUGH_DATA) {
            return;
        }  
        const detections = await faceapi
            .detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions())
            .withFaceExpressions();
        if (detections.length > 0) {
            if (detections[0]?.expressions?.happy > 0.8) {
                socket.emit('smiled', lobby);
                setLost(true);
            }
        }
    };

    useEffect(() => {
        // Listen for gameOver event even if this player already lost
        socket.on("gameOver", (data) => {
            console.log("Game over, received statistics:", data.statistics);
            // No need to do anything here, the Lost component will handle this
        });

        return () => {
            socket.off("gameOver");
        };
    }, []);

    if (gameStartingLoading) {
        return (
            <div>
            {showCountdown && <GameStartingLoading onCountdownEnd={setShowCountdown(false)} />}
            </div>
        );
    }

    if (lost) {
        return <Lost />;
    }

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

            <canvas 
                ref={canvasRef} 
                style={{ display: 'none' }}
            />
            <video 
                ref={videoRef} 
                id="webcam" 
                autoPlay 
                playsInline 
                muted 
                className="webcam-video"
            />
        </div>
    );
};

export default Game;
