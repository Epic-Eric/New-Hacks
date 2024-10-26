// src/Game.js

import React, { useEffect, useState } from 'react';
import socket from './socket';
import { useLocation } from 'react-router-dom';
import './Game.css';

const emojis = ['😀', '😆', '😅', '😂', '🤣', '😊', '😍', '😎', '🤩', '🥳', '😜', '🤪'];

const Game = () => {
    const location = useLocation();
    const { timer: initialTimer = 10, rounds: initialRounds = 3, players: initialPlayers = [] } = location.state || {};

    const [timer, setTimer] = useState(initialTimer);
    const [round, setRound] = useState(initialRounds);
    const [deathLog, setDeathLog] = useState([]);
    const [players, setPlayers] = useState(initialPlayers);

    const [smileDetected, setSmileDetected] = useState(false);


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

    // Countdown timer effect
    useEffect(() => {
        if (timer > 0) {
            const countdown = setInterval(() => setTimer((prev) => Math.max(prev - 1, 0)), 1000);
            return () => clearInterval(countdown);
        } else if (round > 1) {
            setTimer(initialTimer);
            setRound((prevRound) => prevRound - 1);
        }
    }, [timer, round, initialTimer]);

    const handlePlayerDeath = (playerName) => {
        setDeathLog((prevLog) => [...prevLog, `${playerName} has died.`]);
    };

    const captureAndSendFrame = async () => {
        const videoElement = document.getElementById('webcam');
        const canvas = document.createElement('canvas');
        canvas.width = videoElement.videoWidth;
        canvas.height = videoElement.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

        // Convert the canvas to a Blob (image format) to send to the server
        canvas.toBlob(async (blob) => {
            const formData = new FormData();
            formData.append('image', blob, 'frame.jpg');

            // Send the image to the Python server for smile detection
            try {
                const response = await fetch('http://localhost:5001/detect_smile', {
                    method: 'POST',
                    body: formData
                });
                const result = await response.json();

                if (result.smile_detected) {
                    setSmileDetected(true);
                    socket.emit('smile_detected');  // Emit event if a smile is detected
                } else {
                    setSmileDetected(false);
                }
            } catch (error) {
                console.error('Error detecting smile:', error);
            }
        }, 'image/jpeg');
    };

    // Set up webcam capture and send frames at intervals
    useEffect(() => {
        // Start the webcam
        const startWebcam = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                const videoElement = document.getElementById('webcam');
                videoElement.srcObject = stream;
            } catch (error) {
                console.error('Error accessing webcam:', error);
            }
        };

        startWebcam();

        // Capture frames every second
        const intervalId = setInterval(captureAndSendFrame, 1000);

        // Cleanup the interval on component unmount
        return () => clearInterval(intervalId);
    }, []);



    return (
        <div className="game-container">
            <div className="top-bar">
                <h1 className="game-title">krackle.io <span className="emoji">😂</span></h1>
                <div className="game-info">
                    <p>Timer: {timer}s</p>
                    <p>Round: {round}</p>
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

                <div className="video-broadcast">
                    <h2 className="live-broadcast-title">Live Broadcast</h2>
                    <div className="video-placeholder">[ Video Feed ]</div>
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
        </div>
    );
};

export default Game;