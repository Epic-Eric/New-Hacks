// src/Home.js

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import socket from './socket';
import Loading from './Loading';
import './Home.css';

const Home = () => {
    const [playerName, setPlayerName] = useState('');
    const [lobbyCode, setLobbyCode] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const lobby = params.get('lobby');
        if (lobby) {
            setLobbyCode(lobby);
        }

        // Listen for successful join
        socket.on('playerJoined', (player) => {
            console.log(`Joined lobby as ${player.name}`);
            // No need to setIsLoading(true) here since it's already set when attempting to join
        });

        // Listen for lobby not found
        socket.on('lobbyNotFound', () => {
            setError('Lobby not found. Please check the code and try again.');
            setIsLoading(false);
        });

        // Listen for joinLobbyResponse
        socket.on('joinLobbyResponse', ({ success, lobbyCode, message }) => {
            if (success) {
                console.log(`Successfully joined lobby: ${lobbyCode}`);
                // Optionally, you can update UI or navigate
            } else {
                setError(message || 'Failed to join lobby.');
                setIsLoading(false);
            }
        });

        // Listen for game start
        socket.on('gameStarted', (gameSettings) => {
            console.log("Received 'gameStarted' event:", gameSettings);
            setIsLoading(false);
            navigate('/game', { state: { ...gameSettings } });
        });

        // Cleanup listeners on unmount
        return () => {
            console.log("Cleaning up 'playerJoined', 'lobbyNotFound', 'joinLobbyResponse', and 'gameStarted' listeners");
            socket.off('playerJoined');
            socket.off('lobbyNotFound');
            socket.off('joinLobbyResponse');
            socket.off('gameStarted');
        };
    }, [location.search, navigate]);

    const handleStart = () => {
        setError(''); // Clear any previous error message
        if (playerName && lobbyCode) {
            console.log("Attempting to join lobby:", lobbyCode);
            socket.emit('joinLobby', { lobbyCode, playerName });
            setIsLoading(true); // Show loading screen while attempting to join
        } else {
            setError('Please enter both your name and lobby code.');
        }
    };

    const handleCreateGame = () => {
        navigate('/admin'); // Navigate to admin screen for game creation
    };

    // Render loading screen if in loading state
    if (isLoading) {
        return <Loading />;
    }

    return (
        <div className="home-container">
            <h1 className="game-title">krackle.co <span className="emoji">😄</span></h1>
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
