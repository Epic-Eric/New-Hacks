// src/Game.js

import React, { useEffect, useState, useRef } from 'react';
import socket from './socket';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import './Game.css';


// Using a publicly hosted sample video for demonstration
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
    const { name, gameSettings, players } = location.state || {};

    const [timer, setTimer] = useState(gameSettings.timer);
    const roundTime = gameSettings.timer;
    const [round, setRound] = useState(gameSettings.rounds);
    const [deathLog, setDeathLog] = useState([]);
    const [currentPlayers, setPlayers] = useState(players);
    const [smileDetected, setSmileDetected] = useState(false);
    const [webcamError, setWebcamError] = useState(null);  // State to track webcam errors
    
    const [currentVideoUrl, setCurrentVideoUrl] = useState(URL[Math.floor(Math.random() * URL.length)]);

    
    
    const [searchParams] = useSearchParams();
    const params = new URLSearchParams(location.search);
    const lobby = params.get('lobby');

    const navigate = useNavigate();

    const videoRef = useRef(null);  // Reference to the webcam video element


    const changeVideo = () => {
        let newVideoUrl;
        do {
            newVideoUrl = URL[Math.floor(Math.random() * URL.length)];
        } while (newVideoUrl === currentVideoUrl);
        setCurrentVideoUrl(newVideoUrl);
    };

    useEffect(() => {
        console.log(socket.id);
        // Listen for players joining
        socket.on('playerJoined', (player) => {
            setPlayers(prev => [...prev, player.name]);
            console.log(`Game display: player joined: ${player.name}`);
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

    // Countdown timer effect
    useEffect(() => {
        if (timer > 0) {
            const countdown = setInterval(() => setTimer((prev) => Math.max(prev - 1, 0)), 1000);
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

    // Capture webcam frame and send it to Python server
    const captureAndSendFrame = async () => {
        const videoElement = videoRef.current;  // Get the video element reference

        // Ensure the video element is ready before capturing the frame
        if (videoElement && videoElement.videoWidth > 0 && videoElement.videoHeight > 0) {
            const canvas = document.createElement('canvas');
            canvas.width = videoElement.videoWidth;
            canvas.height = videoElement.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
            const imageData = canvas.toDataURL('image/jpeg');

            socket.emit('webcam_data', { image: imageData, lobbyCode: lobby});
        } else {
            console.log("Video element not ready yet.");
        }
    };

    // Set up webcam capture and send frames at intervals
    useEffect(() => {
        // Start the webcam
        const startWebcam = async () => {
            try {
                if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                    throw new Error('Webcam access is not supported by this browser.');
                }

                const stream = await navigator.mediaDevices.getUserMedia({ video: true });

                // Debug the stream object
                console.log('Stream object:', stream);

                const videoElement = videoRef.current;  // Get the video element reference

                if (videoElement) {
                    // Debug the video element before assignment
                    console.log('Video element:', videoElement);

                    videoElement.srcObject = stream;

                    // Ensure the video is ready before capturing frames
                    videoElement.addEventListener('loadedmetadata', () => {
                        console.log("Webcam stream is ready.");
                    });
                } else {
                    throw new Error('Video element is not available');
                }
            } catch (error) {
                console.error('Error accessing webcam:', error);
                setWebcamError(error.message);  // Capture and display the webcam error
            }
        };

        startWebcam();

        // Capture frames every second
        const intervalId = setInterval(captureAndSendFrame, 125);


        socket.on('webcam_response', (message) => {
            console.log('received something just now');
            if (message.message == 'roundLost') {
                navigate('/lost');
            }
        });
        // Cleanup the interval and stop webcam on component unmount
        return () => {
            clearInterval(intervalId);
            // Stop all video tracks to release the webcam
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
                    {webcamError && <p className="error-message">{webcamError}</p>}  {/* Display webcam error if any */}
                </div>
            </div>

            <div className="main-content">
                <div className="player-list">
                    <h2>Players</h2>
                    <div className="player-icons">
                        {currentPlayers.map((player, index) => (
                            <div key={player.id || index} className="player-box">
                                <span className="player-emoji">{emojis[index % emojis.length]}</span>
                                <span className="player-name">{player}</span>
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
                muted  // Muted to comply with autoplay policies if needed
                className="webcam-video"  // Added className for styling
            ></video>
        </div>
    );

};

export default Game;