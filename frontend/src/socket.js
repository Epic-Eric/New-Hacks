// src/socket.js

import { io } from 'socket.io-client';

const SERVER_URL = process.env.REACT_APP_SERVER_URL || 'http://localhost:4001';

const socket = io(SERVER_URL, {
    withCredentials: true,
});

// Handle connection events
socket.on('connect', () => {
    console.log('Connected to backend:', socket.id);
});

socket.on('disconnect', () => {
    console.log('Disconnected from backend');
});

// Handle connection errors
socket.on('connect_error', (err) => {
    console.error('Connection Error:', err.message);
});

// Handle createGameResponse event
socket.on('createGameResponse', (data) => {
    if (data.success) {
        console.log('Game Created with ID:', data.gameId);
        // Implement logic to handle the newly created game, e.g., redirecting the user
    } else {
        console.error('Failed to create game:', data.message);
    }
});

export default socket;
