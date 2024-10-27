// server.js

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const crypto = require('crypto');


//new
const multer = require('multer');
const path = require('path');
const fs = require('fs');


const app = express();
const server = http.createServer(app);

// Define allowed origins
const allowedOrigins = ['https://krackle.co', 'https://www.krackle.co'];

// CORS Configuration
app.use(cors({
    origin: allowedOrigins, // Allow specific origins
    methods: ["GET", "POST"],
    credentials: true
}));

// Initialize Socket.IO with updated CORS
const io = new Server(server, {
    cors: {
        origin: allowedOrigins, // Allow specific origins
        methods: ["GET", "POST"],
        credentials: true
    }
});





//new 

const uploadDir = path.join(__dirname, '../frontend/public/uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);  // Save files to 'public/uploads'
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);  // Timestamp to avoid name collisions
    }
});

const upload = multer({ storage });

// Route for uploading images
app.post('/upload_image', upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
    }
    
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({ message: 'Image uploaded successfully', fileUrl });
});

// Serve static files from the 'public' folder
app.use(express.static(path.join(__dirname, '../frontend/public/uploads')));


//new ends






// Serve static files or set up routes as needed
app.get('/', (req, res) => {
    res.send('Socket.IO Backend is running.');
});

// In-memory storage for lobbies
const lobbies = {};

// Socket.IO Event Handling
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Handle 'createGame' event from frontend
    socket.on('createGame', (gameData) => {
        console.log('Create Game Event Received:', gameData);
        
        // Generate a unique game ID
        const gameId = crypto.randomBytes(4).toString('hex');

        // Create a new lobby
        lobbies[gameId] = {
            admin: socket.id,
            settings: {
                adminName: gameData.adminName,
                timer: gameData.timer,
                rounds: gameData.rounds,
                maxPlayers: gameData.players
            },
            players: []
        };

        // **Join the admin to the lobby room**
        socket.join(gameId);

        // Emit 'createGameResponse' back to the admin client
        socket.emit('createGameResponse', { success: true, gameId });

        // Optional: Notify all clients about the new lobby
        // io.emit('lobbyCreated', { lobbyCode: gameId, players: lobbies[gameId].players });
    });

    // Handle 'joinLobby' event from frontend
    socket.on('joinLobby', ({ lobbyCode, playerName }) => {
        console.log(`Join Lobby Event Received: LobbyCode=${lobbyCode}, PlayerName=${playerName}`);

        const lobby = lobbies[lobbyCode];
        if (lobby) {
            if (lobby.players.length < lobby.settings.maxPlayers) {
                const player = { id: socket.id, name: playerName };
                lobby.players.push(player);
                socket.join(lobbyCode);

                // Emit 'playerJoined' to the lobby room
                io.to(lobbyCode).emit('playerJoined', player);

                // Emit successful join to the player
                socket.emit('joinLobbyResponse', { success: true, lobbyCode });
            } else {
                // Lobby full
                socket.emit('joinLobbyResponse', { success: false, message: 'Lobby is full.' });
            }
        } else {
            // Lobby not found
            socket.emit('joinLobbyResponse', { success: false, message: 'Lobby not found.' });
        }
    });

    // Handle 'startGame' event from admin
    socket.on('startGame', (lobbyCode) => {
        console.log(`Start Game Event Received for LobbyCode=${lobbyCode}`);

        const lobby = lobbies[lobbyCode];
        if (lobby && lobby.admin === socket.id) {
            // Emit 'gameStarted' to all players in the lobby
            io.to(lobbyCode).emit('gameStarted', lobby.settings);

            // Optionally, handle game logic here
        } else {
            // Unauthorized or lobby not found
            socket.emit('startGameResponse', { success: false, message: 'Unauthorized or lobby not found.' });
        }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);

        // Remove player from any lobbies they were part of
        for (const [gameId, lobby] of Object.entries(lobbies)) {
            const playerIndex = lobby.players.findIndex(p => p.id === socket.id);
            if (playerIndex !== -1) {
                const [removedPlayer] = lobby.players.splice(playerIndex, 1);
                // Emit 'playerLeft' to the lobby
                io.to(gameId).emit('playerLeft', removedPlayer);
            }

            // If the disconnected user was the admin, handle lobby closure
            if (lobby.admin === socket.id) {
                delete lobbies[gameId];
                // Emit 'lobbyClosed' if necessary
                io.to(gameId).emit('lobbyClosed', { message: 'Lobby has been closed by the admin.' });
            }
        }
    });
});

const PORT = process.env.PORT || 4001;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
