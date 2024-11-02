import socketio
import secrets
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import base64
import numpy as np
from io import BytesIO
from PIL import Image
from emotionTest import predict_emotion

# Load environment variables from .env file


# Initialize FastAPI and Socket.IO
app = FastAPI()
sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins=[
    'https://krackle.co',
    'https://www.krackle.co',
    'https://test.krackle.co',
    'http://localhost:3000',
    'localhost:8000'
])

# Mount the Socket.IO server to FastAPI
app.mount("/socket.io", socketio.ASGIApp(sio))

# CORS Configuration
origins = [
    'https://krackle.co',
    'https://www.krackle.co',
    'https://test.krackle.co',
    'http://localhost:3000'
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# In-memory storage for lobbies
lobbies = {}

# Root route for checking the server
@app.get("/")
async def root():
    return {"message": "Socket.IO Backend is running."}

# Socket.IO Event Handling
@sio.event
async def connect(sid, environ):
    print(f"A user connected: {sid}")

@sio.event
async def createGame(sid, gameData):
    print(f'Create Game Event Received: {gameData}')
    
    # Generate a unique game ID
    gameId = secrets.token_hex(4)
    
    # Create a new lobby
    lobbies[gameId] = {
        'admin': sid,
        'settings': {
            'adminName': gameData['adminName'],
            'timer': gameData['timer'],
            'rounds': gameData['rounds'],
            'maxPlayers': gameData['players']
        },
        'players': []
    }

    # Admin joins the lobby room
    await sio.enter_room(sid, gameId)

    # Emit 'createGameResponse' back to the admin client
    await sio.emit('createGameResponse', {'success': True, 'gameId': gameId}, to=sid)

@sio.event
async def joinLobby(sid, data):
    lobbyCode = data['lobbyCode']
    playerName = data['playerName']
    print(f"Join Lobby Event Received: LobbyCode={lobbyCode}, PlayerName={playerName}")
    
    lobby = lobbies.get(lobbyCode)
    if lobby:
        if len(lobby['players']) < lobby['settings']['maxPlayers']:
            player = {'id': sid, 'name': playerName}
            lobby['players'].append(player)
            await sio.enter_room(sid, lobbyCode)

            # Emit 'playerJoined' to the lobby room
            await sio.emit('playerJoined', player, room=lobbyCode)

            # Emit successful join to the player
            await sio.emit('joinLobbyResponse', {'success': True, 'lobbyCode': lobbyCode}, to=sid)
        else:
            # Lobby full
            await sio.emit('joinLobbyResponse', {'success': False, 'message': 'Lobby is full.'}, to=sid)
    else:
        # Lobby not found
        await sio.emit('joinLobbyResponse', {'success': False, 'message': 'Lobby not found.'}, to=sid)

@sio.event
async def startGame(sid, lobbyCode):
    print(f"Start Game Event Received for LobbyCode={lobbyCode}")

    lobby = lobbies.get(lobbyCode)
    if lobby and lobby['admin'] == sid:
        # Emit 'gameStarted' to all players in the lobby
        await sio.emit('gameStarted', lobby['settings'], room=lobbyCode)
    else:
        # Unauthorized or lobby not found
        await sio.emit('startGameResponse', {'success': False, 'message': 'Unauthorized or lobby not found.'}, to=sid)

@sio.event
async def disconnect(sid):
    print(f"User disconnected: {sid}")

    # Remove player from any lobbies they were part of
    for gameId, lobby in lobbies.items():
        playerIndex = next((i for i, p in enumerate(lobby['players']) if p['id'] == sid), None)
        if playerIndex is not None:
            removedPlayer = lobby['players'].pop(playerIndex)
            await sio.emit('playerLeft', removedPlayer, room=gameId)

        # If the disconnected user was the admin, handle lobby closure
        if lobby['admin'] == sid:
            del lobbies[gameId]
            await sio.emit('lobbyClosed', {'message': 'Lobby has been closed by the admin.'}, room=gameId)

def process_webcam_data(base64_data: str):
    # Remove the "data:image/png;base64," prefix
    base64_data = base64_data.split(",")[1]
    
    # Decode the base64 image
    image_data = base64.b64decode(base64_data)

    try:
        image = Image.open(BytesIO(image_data))
    
        # Convert to OpenCV format
        image_np = np.array(image)

        emotion = predict_emotion(image_np)
        print(emotion)
        return emotion[0].tolist()
        
    except Exception as e:
        return str(e)


# WebSocket route to handle webcam data and send back processing results
@sio.event
async def webcam_data(sid, data):
    print(f"Webcam data received from {sid}")
    # Process the webcam data (base64 image)
    response_message = process_webcam_data(data['image'])
    # Send response back to client
    await sio.emit('webcam_response', {'message': response_message}, to=sid)


# Run the FastAPI app
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)  # Running on port 8001, as port 8000 is taken by npm start
