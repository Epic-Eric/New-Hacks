import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import './Game.css';

const emojis = ['😀', '😆', '😅', '😂', '🤣', '😊', '😍', '😎', '🤩', '🥳', '😜', '🤪']; // Emojis for each player

const Game = () => {
    const location = useLocation();
    const { timer: initialTimer = 10, rounds: initialRounds = 3, players = [] } = location.state || {};

    const [timer, setTimer] = useState(initialTimer);
    const [round, setRound] = useState(initialRounds);
    const [deathLog, setDeathLog] = useState([]);

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

    const handlePlayerDeath = (player) => {
        setDeathLog((prevLog) => [...prevLog, `${player} has died.`]);
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
                            <div key={index} className="player-box">
                                <span className="player-emoji">{emojis[index % emojis.length]}</span>
                                <span className="player-name">{player}</span>
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
                    {/* Test message below death log */}
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
