import React, { useEffect, useState, useRef } from "react";
import socket from "./socket";
import { useLocation, useNavigate } from "react-router-dom";
import "./Game.css";
import GameStartingLoading from './GameStartingLoading';
import * as tf from '@tensorflow/tfjs';
import { useOpenCv } from 'opencv-react';

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
    const [model, setModel] = useState(null);
    const [faceCascade, setFaceCascade] = useState(null);
    const [gameStartingLoading, setLoading] = useState(true);
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const navigate = useNavigate();
    const opencv = useOpenCv();
    const [isOpenCvLoaded, setIsOpenCvLoaded] = useState(false);

    useEffect(() => {
        if (opencv && opencv.cv) {
            setIsOpenCvLoaded(true);
        }
    }, [opencv]);

    function sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    const detectEmotion = async (imageData) => {
        try {
            if (!faceCascade || !model || !opencv.cv) return null;

            // Convert image data to OpenCV format
            const img = opencv.cv.matFromImageData(imageData);
            const gray = new opencv.cv.Mat();
            opencv.cv.cvtColor(img, gray, opencv.cv.COLOR_RGBA2GRAY);

            // Detect faces
            const faces = new opencv.cv.RectVector();
            faceCascade.detectMultiScale(gray, faces, 1.1, 3, 0);

            let result = null;
            
            // Process the first detected face
            if (faces.size() > 0) {
                const face = faces.get(0);
                // Create a rectangle for face region
                const rect = new opencv.cv.Rect(face.x, face.y, face.width, face.height);
                const faceRegion = gray.roi(rect);
                
                // Resize face region to match model input size
                const resized = new opencv.cv.Mat();
                opencv.cv.resize(faceRegion, resized, new opencv.cv.Size(48, 48));
                
                // Convert to tensor
                const tensor = tf.tensor4d(resized.data, [1, 48, 48, 1])
                    .toFloat()
                    .div(255.0);

                // Get prediction
                const prediction = await model.predict(tensor).data();
                const emotions = ['angry', 'disgust', 'fear', 'happy', 'sad', 'surprise', 'neutral'];
                const maxIndex = prediction.indexOf(Math.max(...prediction));
                result = emotions[maxIndex];

                // Cleanup OpenCV objects
                tensor.dispose();
                resized.delete();
                faceRegion.delete();
            }

            // Cleanup
            img.delete();
            gray.delete();
            faces.delete();

            return result;
        } catch (error) {
            console.error('Error in emotion detection:', error);
            return null;
        }
    };

    useEffect(() => {
        // Load the model and cascade classifier when the component mounts
        const loadModel = async () => {
            if (!isOpenCvLoaded) return;
            
            try {
                // Load TensorFlow.js model
                const loadedModel = await tf.loadLayersModel('/model/model.json');
                setModel(loadedModel);
                console.log("Model loaded");
                
                const cascade = new opencv.cv.CascadeClassifier();
                cascade.load('/haarcascade_frontalface_default.xml');
                setFaceCascade(cascade);

                await sleep(1000);
            } catch (error) {
                console.error('Error loading model:', error);
            } finally {
                setLoading(false);
            }
        };
    
        if (isOpenCvLoaded) {
            loadModel();
        }

        // Cleanup
        return () => {
            if (faceCascade) {
                faceCascade.delete();
            }
        };
    }, [isOpenCvLoaded]);

    const handleCountdownEnd = () => {
        setShowCountdown(false);
        };

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

        if (isOpenCvLoaded) {
            startWebcam();
        }

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
    }, [isOpenCvLoaded]);

    // Modify captureAndSendFrame to use local emotion detection
    const captureAndSendFrame = async () => {
        const videoElement = videoRef.current;
        const canvas = canvasRef.current;
    
        if (!videoElement || !canvas || !videoElement.videoWidth || !videoElement.videoHeight) {
            return;
        }
    
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
    
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
    
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const emotion = await detectEmotion(imageData);
        
        if (emotion) {
            const lobbyCode = new URLSearchParams(location.search).get("lobby");
            socket.emit("emotion_detected", {
                emotion,
                lobbyCode,
            });
        }
    };

    if (gameStartingLoading) {
        return (
            <div>
            {showCountdown && <GameStartingLoading onCountdownEnd={handleCountdownEnd} />}
            </div>
        );
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
