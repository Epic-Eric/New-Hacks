// server.js

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const crypto = require('crypto');
const cors = require('cors'); // If not already included

const app = express();
const server = http.createServer(app);

// CORS Configuration
const io = new Server(server, {
    cors: {
        origin: "http://localhost:3000", // Your React app's origin
        methods: ["GET", "POST"],
        credentials: true
    }
});

// Optional: If your server serves HTTP routes, configure CORS for Express
app.use(cors({
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
}));

const lobbies = {};

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Handle lobby creation with admin settings
    socket.on('createLobby', (adminSettings) => {
        const lobbyCode = crypto.randomBytes(3).toString('hex'); // 6-character code
        lobbies[lobbyCode] = { 
            players: [{ id: socket.id, name: adminSettings.adminName }],
            settings: {
                timer: adminSettings.timer,
                rounds: adminSettings.rounds,
                maxPlayers: adminSettings.players
            }
        };
        socket.join(lobbyCode);
        socket.emit('lobbyCreated', { lobbyCode, players: lobbies[lobbyCode].players });
        console.log(`Lobby ${lobbyCode} created by ${adminSettings.adminName}`);
    });

    // Handle players joining a lobby
    socket.on('joinLobby', ({ lobbyCode, playerName }) => {
        if (lobbies[lobbyCode]) {
            lobbies[lobbyCode].players.push({ id: socket.id, name: playerName });
            socket.join(lobbyCode);
            io.to(lobbyCode).emit('playerJoined', { id: socket.id, name: playerName });
            console.log(`User ${playerName} (${socket.id}) joined lobby ${lobbyCode}`);
        } else {
            socket.emit('lobbyNotFound');
            console.log(`Lobby not found: ${lobbyCode}`);
        }
    });

    // Handle disconnections
    socket.on('disconnect', () => {
        for (const lobbyCode in lobbies) {
            const playerIndex = lobbies[lobbyCode].players.findIndex(player => player.id === socket.id);
            if (playerIndex !== -1) {
                const player = lobbies[lobbyCode].players.splice(playerIndex, 1)[0];
                io.to(lobbyCode).emit('playerLeft', { id: socket.id, name: player.name });
                if (lobbies[lobbyCode].players.length === 0) {
                    delete lobbies[lobbyCode];
                    console.log(`Lobby ${lobbyCode} deleted as it became empty.`);
                }
                break;
            }
        }
        console.log('User disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 4001;
server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
