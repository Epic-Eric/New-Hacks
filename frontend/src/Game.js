// src/Game.js

import React, { useEffect, useState, useRef } from 'react';
import socket from './socket'; // Ensure Socket.IO is properly initialized
import { useLocation } from 'react-router-dom';
import './Game.css';

const URL = [
    'https://www.youtube.com/embed/qjckWVDjxoI?autoplay=1',
    'https://www.youtube.com/embed/GPIP6Q6WOfk?autoplay=1',
    'https://www.youtube.com/embed/thY3TbclJ2c?autoplay=1',
    'https://www.youtube.com/embed/p-d87-zmtbc?autoplay=1',
    'https://www.youtube.com/embed/z22jKvMYHOY?autoplay=1'
];

const emojis = ['😀', '😆', '😅', '😂', '🤣', '😊', '😍', '😎', '🤩', '🥳', '😜', '🤪'];

const Game = () => {
    const location = useLocation();
    const { timer: initialTimer = 10, rounds: initialRounds = 3, players: initialPlayers = [] } = location.state || {};

    const [timer, setTimer] = useState(initialTimer);
    const [round, setRound] = useState(initialRounds);
    const [deathLog, setDeathLog] = useState([]);
    const [players, setPlayers] = useState(initialPlayers);
    const [smileDetected, setSmileDetected] = useState(false);
    const [webcamError, setWebcamError] = useState(null);
    const [currentVideoUrl, setCurrentVideoUrl] = useState('');

    const videoRef = useRef(null);
    const frameCounter = useRef(0); // Initialize frame counter

    // Function to pick a new random video URL that’s different from the current one
    const getRandomVideoUrl = () => {
        let newVideoUrl;
        do {
            newVideoUrl = URL[Math.floor(Math.random() * URL.length)];
        } while (newVideoUrl === currentVideoUrl);
        return newVideoUrl;
    };

    useEffect(() => {
        // Listen for 'videoChanged' event from the server
        socket.on('videoChanged', (newVideoUrl) => {
            console.log(`Video changed to: ${newVideoUrl}`);
            setCurrentVideoUrl(newVideoUrl);
        });

        // If no video is set yet, request the current video from the server or set one
        if (!currentVideoUrl) {
            // Emit an event to request the current video URL
            socket.emit('requestCurrentVideo');
        }

        // Listen for 'currentVideo' event to set the initial video URL
        socket.on('currentVideo', (videoUrl) => {
            console.log(`Setting initial video to: ${videoUrl}`);
            setCurrentVideoUrl(videoUrl);
        });

        // Cleanup on unmount
        return () => {
            socket.off('videoChanged');
            socket.off('currentVideo');
        };
    }, [currentVideoUrl]);

    useEffect(() => {
        // Listen for players joining
        socket.on('playerJoined', (player) => {
            setPlayers(prev => [...prev, player]);
            console.log(`Player joined: ${player.name}`);
        });

        // Listen for players leaving
        socket.on('playerLeft', (player) => {
            setPlayers(prev => prev.filter(p => p.id !== player.id));
            console.log(`Player left: ${player.name}`);
        });

        // Cleanup on unmount
        return () => {
            socket.off('playerJoined');
            socket.off('playerLeft');
        };
    }, []);

    useEffect(() => {
        // Countdown timer effect
        if (timer > 0) {
            const countdown = setInterval(() => setTimer((prev) => Math.max(prev - 1, 0)), 1000);
            return () => clearInterval(countdown);
        } else {
            // When timer hits 0, switch video and reset the timer
            const newVideoUrl = getRandomVideoUrl();
            setTimer(initialTimer);
            setRound((prevRound) => prevRound > 1 ? prevRound - 1 : prevRound);

            // Emit 'videoChanged' event with the new video URL
            socket.emit('videoChanged', newVideoUrl);
        }
    }, [timer, initialTimer, round, currentVideoUrl]);

    const handlePlayerDeath = (playerName) => {
        setDeathLog((prevLog) => [...prevLog, `${playerName} has died.`]);
    };

    // Capture webcam frame and send it to Python server
    const captureAndSendFrame = async () => {
        frameCounter.current += 1; // Increment frame counter
        console.log(`Frame counter: ${frameCounter.current}`);

        // Capture every 5th frame
        if (frameCounter.current % 5 !== 0) {
            console.log("Skipping frame");
            return; // Skip this frame
        }

        const videoElement = videoRef.current;
        console.log(`Capturing frame from videoElement: `, videoElement);

        if (videoElement && videoElement.videoWidth > 0 && videoElement.videoHeight > 0) {
            const canvas = document.createElement('canvas');
            canvas.width = videoElement.videoWidth;
            canvas.height = videoElement.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
            console.log("Frame drawn on canvas");

            canvas.toBlob(async (blob) => {
                if (blob) {
                    console.log("Blob created, preparing to send to server");
                    const formData = new FormData();
                    formData.append('image', blob, `frame_${Date.now()}.jpg`); // Unique filename

                    try {
                        console.log("Sending image to server...");
                        const response = await fetch('http://localhost:5001/save_image', { // Ensure this is the correct server endpoint
                            method: 'POST',
                            body: formData
                        });
                        console.log("Fetch request sent, awaiting response...");
                        const result = await response.json();
                        console.log("Fetch response received:", result);

                        if (result.success) {
                            console.log('Image saved successfully:', result.filePath);
                        } else {
                            console.error('Failed to save image:', result.message);
                        }
                    } catch (error) {
                        console.error('Error saving image:', error);
                    }
                } else {
                    console.log("Blob is null, skipping send");
                }
            }, 'image/jpeg');
        } else {
            console.log("Video element not ready yet.");
        }
    };

    // Set up webcam capture and send frames at intervals
    useEffect(() => {
        const startWebcam = async () => {
            try {
                if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                    throw new Error('Webcam access is not supported by this browser.');
                }

                const stream = await navigator.mediaDevices.getUserMedia({ video: true });

                const videoElement = videoRef.current;
                if (videoElement) {
                    videoElement.srcObject = stream;
                    videoElement.addEventListener('loadedmetadata', () => {
                        console.log("Webcam stream is ready.");
                        videoElement.play();
                    });
                } else {
                    throw new Error('Video element is not available.');
                }
            } catch (error) {
                console.error('Error accessing webcam:', error);
                setWebcamError(error.message);
            }
        };

        startWebcam();

        // Capture frames every 200ms (~5 frames per second)
        const intervalId = setInterval(captureAndSendFrame, 200);

        return () => {
            clearInterval(intervalId);
            if (videoRef.current && videoRef.current.srcObject) {
                videoRef.current.srcObject.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    return (
        <div className="game-container">
            <div className="top-bar">
                <h1 className="game-title">krackle.io <span className="emoji">😂</span></h1>
                <div className="game-info">
                    <p>Timer: {timer}s</p>
                    <p>Round: {round}</p>
                    <p>{smileDetected ? 'Smile detected!' : 'No smile detected.'}</p>
                    {webcamError && <p className="error-message">{webcamError}</p>}
                </div>
            </div>

            <div className="main-content">
                <div className="player-list">
                    <h2>Players</h2>
                    <div className="player-icons">
                        {players.map((player, index) => (
                            <div key={player.id || index} className="player-box">
                                <span className="player-emoji">{emojis[index % emojis.length]}</span>
                                <span className="player-name">{player.name}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="main-video-container">
                    <div className="video-container">
                        <iframe
                            className="youtube-iframe"
                            src={currentVideoUrl}
                            title="YouTube video player"
                            frameBorder="0"
                            allowFullScreen={false}
                            allow="autoplay; encrypted-media;"
                        ></iframe>
                        <div className="overlay"></div>
                    </div>
                </div>

                <div className="death-log">
                    <h2>Death Log</h2>
                    <ul>
                        {deathLog.map((log, index) => (
                            <li key={index}>{log}</li>
                        ))}
                    </ul>
                    <div className="test-message">
                        <p>Player one died</p>
                        <p className="points">+ 900 points</p>
                    </div>
                </div>
            </div>

            {/* Webcam Video Element */}
            <video 
                ref={videoRef} 
                id="webcam" 
                autoPlay 
                playsInline 
                muted
                className="webcam-video"
                style={{ width: '300px', border: '1px solid black' }}
            ></video>
        </div>
    );
};

export default Game;
