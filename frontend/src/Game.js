// src/Game.js

import React, { useEffect, useState } from 'react';
import socket from './socket';
import { useLocation } from 'react-router-dom';
import './Game.css';

const emojis = ['😀', '😆', '😅', '😂', '🤣', '😊', '😍', '😎', '🤩', '🥳', '😜', '🤪']; // Emojis for each player

const Game = () => {
    const location = useLocation();
    const { timer: initialTimer = 10, rounds: initialRounds = 3, players: initialPlayers = [] } = location.state || {};
    const [timer, setTimer] = useState(initialTimer);
    const [round, setRound] = useState(initialRounds);
    const [deathLog, setDeathLog] = useState([]);
    const [players, setPlayers] = useState(initialPlayers);
    const [lobbyCode, setLobbyCode] = useState('');

    useEffect(() => {
        // Optionally, get the lobby code from the URL
        const params = new URLSearchParams(location.search);
        const lobby = params.get('lobby');
        if (lobby) {
            setLobbyCode(lobby);
            // Optionally, emit an event to fetch the current players
            // socket.emit('getLobbyInfo', lobby);
        }

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

        // Listen for game start
        socket.on('gameStarted', (gameSettings) => {
            // Initialize game with gameSettings
            console.log('Game started:', gameSettings);
            // Set timer and rounds based on gameSettings
            setTimer(gameSettings.timer);
            setRound(gameSettings.rounds);
            // Initialize other game settings
        });

        // Cleanup on unmount
        return () => {
            socket.off('playerJoined');
            socket.off('playerLeft');
            socket.off('gameStarted');
        };
    }, [location.search]);

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
        // Implement further logic, e.g., updating scores
    };

    return (
        <div className="game-container">
            {/* Title and Game Information */}
            <div className="top-bar">
                <h1 className="game-title">crackle.io <span className="emoji">😂</span></h1>
                <div className="game-info">
                    <p>Timer: {timer}s</p>
                    <p>Round: {round}</p>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="main-content">
                {/* Player List */}
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

                {/* Live Video Area */}
                <div className="video-broadcast">
                    <h2 className="live-broadcast-title">Live Broadcast</h2>
                    <div className="video-placeholder">[ Video Feed ]</div>
                </div>

                {/* Death Log */}
                <div className="death-log">
                    <h2>Death Log</h2>
                    <ul>
                        {deathLog.map((log, index) => (
                            <li key={index}>{log}</li>
                        ))}
                    </ul>
                    {/* Example test message */}
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
