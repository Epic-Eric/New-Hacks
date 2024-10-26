// src/Home.js

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import socket from './socket';
import './Home.css';

const Home = () => {
    const [playerName, setPlayerName] = useState('');
    const [lobbyCode, setLobbyCode] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        // Check if there's a lobby code in the URL
        const params = new URLSearchParams(location.search);
        const lobby = params.get('lobby');
        if (lobby) {
            setLobbyCode(lobby);
        }

        // Listen for successful join
        socket.on('playerJoined', (player) => {
            console.log(`Joined lobby as ${player.name}`);
            navigate('/game', { state: { timer: 0, rounds: 0, players: [] } }); // Adjust state as needed
        });

        // Listen for lobby not found
        socket.on('lobbyNotFound', () => {
            setError('Lobby not found. Please check the code and try again.');
        });

        // Cleanup on unmount
        return () => {
            socket.off('playerJoined');
            socket.off('lobbyNotFound');
        };
    }, [location.search, navigate]);

    const handleStart = () => {
        if (playerName && lobbyCode) {
            socket.emit('joinLobby', { lobbyCode, playerName });
        } else {
            setError('Please enter both your name and lobby code.');
        }
    };

    const handleCreateGame = () => {
        navigate('/admin');
    };

    return (
        <div className="home-container">
            <h1 className="game-title">crackle.io <span className="emoji">😄</span></h1>
            <div className="name-entry">
                <label className="name-label">
                    Name:
                    <input
                        type="text"
                        className="name-input"
                        placeholder="Enter your name"
                        value={playerName}
                        onChange={(e) => setPlayerName(e.target.value)}
                    />
                </label>
                <label className="lobby-label">
                    Lobby Code:
                    <input
                        type="text"
                        className="lobby-input"
                        placeholder="Enter lobby code"
                        value={lobbyCode}
                        onChange={(e) => setLobbyCode(e.target.value)}
                    />
                </label>
                {error && <p className="error-message">{error}</p>}
            </div>
            <div className="button-container">
                <button className="play-button" onClick={handleStart}>
                    Play!
                </button>
                <button className="create-game-button" onClick={handleCreateGame}>
                    Create a New Game
                </button>
            </div>
            <div className="about-link">
                <a href="/about">About</a>
            </div>
        </div>
    );
};

export default Home;
