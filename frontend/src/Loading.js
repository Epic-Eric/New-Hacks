// // src/Loading.js

import React, { useState, useEffect } from 'react';
import socket from './socket';
import './Loading.css';

const Loading = ({playerList}) => {
    const [players, setPlayers] = useState([]);

    useEffect(() => {
        // Mock function to simulate fetching players
        setPlayers(playerList);

        
        socket.on('playerJoined', (player) => {
            setPlayers(prev => [...prev, player['name']]);
        });

        // Clean up the event listener on unmount
        return () => {
            socket.off('playersUpdated');
            socket.off('playerJoined');
        };
    }, []);

    return (
        <div className="loading-container">
            <p className="loading-message">Waiting for Admin to Start the Game...</p>
            <span className="loading-emoji">😄</span>
            <div className="lobby-players">
                <h3>Players in Lobby:</h3>
                <ul >
                    {players.map((player, index) => (
                        <li key={index} className="player-item">{player}</li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

export default Loading;
