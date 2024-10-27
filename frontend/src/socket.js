// src/socket.js

import { io } from 'socket.io-client';

const SERVER_URL = process.env.REACT_APP_SERVER_URL;
console.log('SERVER_URL:', SERVER_URL); // For debugging

if (!SERVER_URL) {
    console.error('REACT_APP_SERVER_URL is not defined. Please set it in your environment variables.');
}

const socket = io(SERVER_URL, {
    withCredentials: true, // If using credentials
    transports: ['websocket'], // Force websocket transport
});

// Handle connection errors
socket.on('connect_error', (err) => {
    console.error('Connection Error:', err.message);
});

export default socket;
