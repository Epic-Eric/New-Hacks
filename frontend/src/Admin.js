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
                setCurrentPlayers([]); // Initialize with no players
                console.log(`Lobby created with code: ${gameId}`);
            } else {
                setError(message || 'Failed to create game.');
                console.error('Failed to create game:', message);
            }
        });

        // Listen for players joining
        socket.on('playerJoined', (player) => {
            setCurrentPlayers(prev => [...prev, player]);
            console.log(`Player joined: ${player.name}`);
        });

        // Listen for players leaving
        socket.on('playerLeft', (player) => {
            setCurrentPlayers(prev => prev.filter(p => p.id !== player.id));
            console.log(`Player left: ${player.name}`);
        });

        // Cleanup on unmount
        return () => {
            socket.off('createGameResponse');
            socket.off('playerJoined');
            socket.off('playerLeft');
        };
    }, []);

    const handleCreateGame = () => {
        setError(''); // Clear any previous error message
        if (adminName && timer > 0 && rounds > 0 && players > 0) {
            const adminSettings = {
                adminName,
                timer,
                rounds,
                players
            };
            socket.emit('createGame', adminSettings);
        } else {
            setError('Please provide valid game settings.');
        }
    };

    const handleStartGame = () => {
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
            <h1>Admin Panel</h1>
            {!lobbyCode ? (
                <div className="create-game">
                    <label>
                        Admin Name:
                        <input
                            type="text"
                            value={adminName}
                            onChange={(e) => setAdminName(e.target.value)}
                            placeholder="Enter your name"
                        />
                    </label>
                    <div className="settings">
                        <label>
                            Timer (seconds):
                            <input
                                type="number"
                                value={timer}
                                onChange={(e) => setTimer(Number(e.target.value))}
                                min="1"
                            />
                        </label>
                        <label>
                            Rounds:
                            <input
                                type="number"
                                value={rounds}
                                onChange={(e) => setRounds(Number(e.target.value))}
                                min="1"
                            />
                        </label>
                        <label>
                            Max Players:
                            <input
                                type="number"
                                value={players}
                                onChange={(e) => setPlayers(Number(e.target.value))}
                                min="1"
                            />
                        </label>
                    </div>
                    {error && <p className="error-message">{error}</p>}
                    <button className="start-game-button" onClick={handleCreateGame}>
                        Create Game
                    </button>
                </div>
            ) : (
                <div className="lobby-info">
                    <p><strong>Lobby Code:</strong> {lobbyCode}</p>
                    <button className="copy-link-button" onClick={handleCopyLink}>
                        Copy Invite Link
                    </button>
                    <h2>Players Joined:</h2>
                    <ul>
                        {currentPlayers.map(player => (
                            <li key={player.id}>{player.name}</li>
                        ))}
                    </ul>
                    <button
                        className="start-game-button"
                        onClick={handleStartGame}
                        disabled={currentPlayers.length < 2} // Example condition
                    >
                        Start Game
                    </button>
                </div>
            )}
        </div>
    );
};

export default Admin;
