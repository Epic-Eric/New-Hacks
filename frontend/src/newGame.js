// import React, { useEffect, useState, useRef } from "react";
// import socket from "./socket";
// import { useLocation, useNavigate } from "react-router-dom";
// import "./Game.css";
// import GameStartingLoading from './GameStartingLoading';
// import * as faceapi from 'face-api.js';

// const Game = () => {
//     const location = useLocation();
//     const { name, gameSettings, players } = location.state || {};
//     const [timer, setTimer] = useState(gameSettings.timer);
//     const [showCountdown, setShowCountdown] = useState(true);
//     const roundTime = gameSettings.timer;
//     const [round, setRound] = useState(gameSettings.rounds);
//     const [deathLog, setDeathLog] = useState([]);
//     const [currentPlayers, setPlayers] = useState(players);
//     const [videoList, setVideoList] = useState([]);
//     const [currentVideoUrl, setCurrentVideoUrl] = useState("");
//     const [gameStartingLoading, setLoading] = useState(true);
//     const videoRef = useRef(null);
//     const canvasRef = useRef(null);
//     const navigate = useNavigate();
//     const params = new URLSearchParams(location.search);
//     const lobby = params.get('lobby');

//     // Optional: a mapping if you wish to rename expressions
//     const emotion_dict = {
//         angry: 'angry',
//         disgusted: 'disgust',
//         fearful: 'fear',
//         happy: 'happy',
//         sad: 'sad',
//         surprised: 'surprise',
//         neutral: 'neutral'
//     };

//     useEffect(() => {
//         // Load face-api models from the public /models folder
//         const loadModels = async () => {
//             await faceapi.nets.tinyFaceDetector.loadFromUri('/tiny');
//             await faceapi.nets.faceExpressionNet.loadFromUri('/expression');
//             setLoading(false);
//         };
//         loadModels();
//     }, []);

//     function sleep(ms) {
//         return new Promise((resolve) => setTimeout(resolve, ms));
//     }

//     // New function that uses face-api to detect emotion from the video element
//     const detectEmotion = async () => {
//         if (!videoRef.current) return null;
//         const detection = await faceapi
//             .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
//             .withFaceExpressions();
//         if (!detection || !detection.expressions) return null;
//         return detection.expressions;
//     };

//     useEffect(() => {
//         // Fetch video list from the backend
//         const fetchVideos = async () => {
//             try {
//                 const response = await fetch("http://127.0.0.1:8000/fetch_videos");
//                 const data = await response.json();
//                 if (data.success) {
//                     setVideoList(data.videos);
//                     setCurrentVideoUrl(data.videos[0]); // Set the first video as the default
//                 } else {
//                     console.error("Error fetching videos:", data.error);
//                 }
//             } catch (error) {
//                 console.error("Error:", error);
//             }
//         };

//         fetchVideos();
//     }, []);

//     const changeVideo = () => {
//         if (videoList.length > 0) {
//             const nextVideoIndex =
//                 (videoList.indexOf(currentVideoUrl) + 1) % videoList.length;
//             setCurrentVideoUrl(videoList[nextVideoIndex]);
//         }
//     };

//     useEffect(() => {
//         console.log(socket.id);
//         // Listen for players joining
//         socket.on("playerJoined", (player) => {
//             setPlayers((prev) => [...prev, player.name]);
//             console.log(`Game display: player joined: ${player.name}`);
//         });

//         // Listen for players leaving
//         socket.on("playerLeft", (player) => {
//             setPlayers((prev) => prev.filter((p) => p.id !== player.id));
//             console.log(`Player left: ${player.name}`);
//         });

//         // Cleanup on unmount
//         return () => {
//             socket.off("playerJoined");
//             socket.off("playerLeft");
//         };
//     }, []);

//     // Countdown timer effect
//     useEffect(() => {
//         if (timer > 0) {
//             const countdown = setInterval(
//                 () => setTimer((prev) => Math.max(prev - 1, 0)),
//                 1000
//             );
//             return () => clearInterval(countdown);
//         } else {
//             changeVideo();
//             setTimer(roundTime);
//             setRound((prevRound) => prevRound - 1);
//         }
//     }, [timer, round, roundTime]);

//     const handlePlayerDeath = (playerName) => {
//         setDeathLog((prevLog) => [...prevLog, `${playerName} has died.`]);
//     };

//     useEffect(() => {
//         const startWebcam = async () => {
//             try {
//                 const stream = await navigator.mediaDevices.getUserMedia({ 
//                     video: {
//                         width: { ideal: 640 },
//                         height: { ideal: 480 }
//                     } 
//                 });
                
//                 if (videoRef.current) {
//                     videoRef.current.srcObject = stream;
//                     // Initialize canvas once video metadata is loaded
//                     videoRef.current.onloadedmetadata = () => {
//                         if (canvasRef.current) {
//                             canvasRef.current.width = videoRef.current.videoWidth;
//                             canvasRef.current.height = videoRef.current.videoHeight;
//                         }
//                     };
//                 }
//             } catch (error) {
//                 console.error("Error accessing webcam:", error);
//             }
//         };

//         startWebcam();

//         const intervalId = setInterval(captureAndSendFrame, 2000);

//         socket.on("webcam_response", (message) => {
//             if (message.message === "roundLost") {
//                 navigate("/lost");
//             }
//         });

//         return () => {
//             clearInterval(intervalId);
//             if (videoRef.current && videoRef.current.srcObject) {
//                 videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
//             }
//         };
//     }, []);

//     // Use face-api for emotion detection on the webcam data
//     const captureAndSendFrame = async () => {
//         if (!videoRef.current || videoRef.current.readyState < 2) return; // Ensure video is ready

//         const expressions = await detectEmotion();

//         if (expressions) {
//             // Determine the emotion with the highest probability
//             let maxEmotion = null;
//             let maxProbability = 0;
//             for (const [emotion, probability] of Object.entries(expressions)) {
//                 if (probability > maxProbability) {
//                     maxProbability = probability;
//                     maxEmotion = emotion;
//                 }
//             }
//             console.log("Detected emotion:", maxEmotion);

//             // If the detected emotion is 'happy', trigger the game rule
//             if (maxEmotion === 'happy') {
//                 navigate("/lost");
//             }
//         }
//     };

//     if (gameStartingLoading) {
//         return (
//             <div>
//                 {showCountdown && <GameStartingLoading onCountdownEnd={() => setShowCountdown(false)} />}
//             </div>
//         );
//     }

//     return (
//         <div className="game-container">
//             <div className="top-bar">
//                 <h1 className="game-title">
//                     krackle.io <span className="emoji">😂</span>
//                 </h1>
//                 <div className="game-info">
//                     <p>Timer: {timer}s</p>
//                     <p>Round: {round}</p>
//                 </div>
//             </div>

//             <div className="main-content">
//                 <div className="player-list">
//                     <h2>Players</h2>
//                     <div className="player-icons">
//                         {currentPlayers.map((player, index) => (
//                             <div key={index} className="player-box">
//                                 <span className="player-name">{player}</span>
//                             </div>
//                         ))}
//                     </div>
//                 </div>

//                 <div className="main-video-container">
//                     <div className="video-container">
//                         {currentVideoUrl ? (
//                             <iframe
//                                 className="youtube-iframe"
//                                 src={currentVideoUrl}
//                                 title="YouTube video player"
//                                 frameBorder="0"
//                                 allow="autoplay; encrypted-media"
//                                 allowFullScreen={false}
//                             ></iframe>
//                         ) : (
//                             <p>Loading videos...</p>
//                         )}
//                     </div>
//                 </div>

//                 <div className="death-log">
//                     <h2>Death Log</h2>
//                     <ul>
//                         {deathLog.map((log, index) => (
//                             <li key={index}>{log}</li>
//                         ))}
//                     </ul>
//                 </div>
//             </div>

//             <canvas 
//                 ref={canvasRef} 
//                 style={{ display: 'none' }}
//             />
//             <video 
//                 ref={videoRef} 
//                 id="webcam" 
//                 autoPlay 
//                 playsInline 
//                 muted 
//                 className="webcam-video"
//             />
//         </div>
//     );
// };

// export default Game;
