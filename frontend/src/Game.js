// src/Game.js

import React, { useEffect, useState } from 'react';
import socket from './socket';
import { useLocation } from 'react-router-dom';

const Game = () => {
    const [players, setPlayers] = useState([]);
    const location = useLocation();
    const params = new URLSearchParams(location.search);
    const lobbyCode = params.get('lobby');

    useEffect(() => {
        // Initial players list
        // Optionally, you can request the current players from the server

        // Listen for new players joining
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

    return (
        <div className="game-container">
            <h1>Game Lobby: {lobbyCode}</h1>
            <h2>Players:</h2>
            <ul>
                {players.map(player => (
                    <li key={player.id}>{player.name}</li>
                ))}
            </ul>
            {/* Add game logic here */}
        </div>
    );
};

export default Game;
