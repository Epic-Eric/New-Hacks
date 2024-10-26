// src/socket.js

import { io } from 'socket.io-client';

const SERVER_URL = process.env.REACT_APP_SERVER_URL || 'http://localhost:4001';

const socket = io(SERVER_URL, {
    withCredentials: true, // If using credentials
});

// Handle connection errors
socket.on('connect_error', (err) => {
    console.error('Connection Error:', err.message);
});

export default socket;
