// src/Admin.js

import React, { useState, useEffect } from 'react';
import './Admin.css'; // Import the CSS for styling
import { useNavigate } from 'react-router-dom';
import socket from './socket';

const Admin = () => {
    const [timer, setTimer] = useState(10);
    const [rounds, setRounds] = useState(3);
    const [players, setPlayers] = useState(2); // Max players
    const [lobbyCode, setLobbyCode] = useState('');
    const [adminName, setAdminName] = useState('Admin'); // You can make this dynamic

    const [currentPlayers, setCurrentPlayers] = useState([]);

    const [error, setError] = useState('');

    const navigate = useNavigate(); // Initialize navigate

    useEffect(() => {
        // Listen for createGameResponse
        socket.on('createGameResponse', ({ success, gameId, message }) => {
            if (success) {
                setLobbyCode(gameId);
                setCurrentPlayers([{ id: 'admin', name: adminName }]); // Initialize with admin as first player
                console.log(`Lobby created with code: ${gameId}`);
            } else {
                setError(message || 'Failed to create game.');
                console.error('Failed to create game:', message);
            }
        });

        // Listen for players joining
        socket.on('playerJoined', (player) => {
            // Prevent adding admin again
            if (player.id !== 'admin') {
                setCurrentPlayers(prev => {
                    // Check if player already exists
                    if (prev.find(p => p.id === player.id)) {
                        return prev;
                    }
                    return [...prev, player];
                });
                console.log(`Admin display: Player joined: ${player.name}`);
            }
        });

        // Listen for players leaving
        socket.on('playerLeft', (player) => {
            // Prevent removing admin
            if (player.id !== 'admin') {
                setCurrentPlayers(prev => prev.filter(p => p.id !== player.id));
                console.log(`Player left: ${player.name}`);
            }
        });

        // Cleanup on unmount
        return () => {
            socket.off('createGameResponse');
            socket.off('playerJoined');
            socket.off('playerLeft');
        };
    }, [adminName]);

    const handleCreateGame = () => {
        setError(''); // Clear any previous error message
        if (adminName.trim() !== '' && timer > 0 && rounds > 0 && players > 0) {
            const adminSettings = {
                adminName,
                timer,
                rounds,
                players
            };
            socket.emit('createGame', adminSettings);
            // Remove the following line to prevent immediate admin addition
            // setCurrentPlayers([{ id: 'admin', name: adminName }]);
        } else {
            setError('Please provide valid game settings.');
        }
    };

    const handleStartGame = () => {
        if (currentPlayers.length < 2) {
            setError('At least 2 players are required to start the game.');
            return;
        }

        console.log("Starting game with settings:", { timer, rounds, players: currentPlayers.length });
        // Emit 'startGame' event to backend
        socket.emit('startGame', lobbyCode);
        // Navigate to game screen
        navigate('/game', { state: { timer: parseInt(timer), rounds: parseInt(rounds), players: currentPlayers.map(p => p.name) } });
    };

    const handleCopyLink = () => {
        const inviteLink = `${window.location.origin}/?lobby=${lobbyCode}`;
        navigator.clipboard.writeText(inviteLink)
            .then(() => {
                alert("Invite link copied to clipboard!");
            })
            .catch(err => {
                console.error('Failed to copy: ', err);
            });
    };

    const handleGoHome = () => {
        navigate('/');
    };

    return (
        <div className="admin-container">
            <h1 className="admin-title">Admin Panel</h1>
            {!lobbyCode ? (
                <div className="create-game-section">
                    <h2>Create a New Game</h2>
                    <div className="form-group">
                        <label htmlFor="adminName">Admin Name:</label>
                        <input
                            type="text"
                            id="adminName"
                            value={adminName}
                            onChange={(e) => setAdminName(e.target.value)}
                            placeholder="Enter your name"
                            className="admin-input"
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="timer">Timer (seconds):</label>
                        <input
                            type="number"
                            id="timer"
                            value={timer}
                            onChange={(e) => setTimer(Number(e.target.value))}
                            min="1"
                            className="admin-input"
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="rounds">Rounds:</label>
                        <input
                            type="number"
                            id="rounds"
                            value={rounds}
                            onChange={(e) => setRounds(Number(e.target.value))}
                            min="1"
                            className="admin-input"
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="players">Max Players:</label>
                        <input
                            type="number"
                            id="players"
                            value={players}
                            onChange={(e) => setPlayers(Number(e.target.value))}
                            min="1"
                            className="admin-input"
                        />
                    </div>
                    {error && <p className="error-message">{error}</p>}
                    <button className="btn create-game-button" onClick={handleCreateGame}>
                        Create Game
                    </button>
                </div>
            ) : (
                <div className="lobby-info-section">
                    <p><strong>Lobby Code:</strong> {lobbyCode}</p>
                    <button className="btn copy-link-button" onClick={handleCopyLink}>
                        Copy Invite Link
                    </button>
                    <h2>Players Joined:</h2>
                    <ul className="player-list">
                        {currentPlayers.map(player => (
                            <li key={player.id} className="player-item">
                                <span className="player-emoji">👤</span> {player.name}
                            </li>
                        ))}
                    </ul>
                    <button
                        className="btn start-game-button"
                        onClick={handleStartGame}
                        disabled={currentPlayers.length < 2} // Example condition
                    >
                        Start Game
                    </button>
                    {currentPlayers.length < 2 && (
                        <p className="info-message">Waiting for more players to join...</p>
                    )}
                    <button className="btn go-home-button" onClick={handleGoHome}>
                        Go Home
                    </button>
                </div>
            )}
        </div>
    );

};

export default Admin;
