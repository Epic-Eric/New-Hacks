import os 
import socketio
import secrets
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import numpy as np
from io import BytesIO
from PIL import Image
import uvicorn
import time
from typing import Literal
import numpy as np
import cv2
from keras_core.models import Sequential
from keras_core.layers import Dense, Dropout, Flatten
from keras_core.layers import Conv2D, MaxPooling2D
import dotenv
from supabase import create_client, Client
from pytube import Search
import random

model = Sequential()

# Add layers
model.add(Conv2D(32, kernel_size=(3, 3), activation='relu', input_shape=(48, 48, 1)))
model.add(Conv2D(64, kernel_size=(3, 3), activation='relu'))
model.add(MaxPooling2D(pool_size=(2, 2)))
model.add(Dropout(0.25))

model.add(Conv2D(128, kernel_size=(3, 3), activation='relu'))
model.add(MaxPooling2D(pool_size=(2, 2)))
model.add(Conv2D(128, kernel_size=(3, 3), activation='relu'))
model.add(MaxPooling2D(pool_size=(2, 2)))
model.add(Dropout(0.25))

model.add(Flatten())
model.add(Dense(1024, activation='relu'))
model.add(Dropout(0.5))
model.add(Dense(7, activation='softmax'))


# Disable OpenCL to avoid unnecessary logs
cv2.ocl.setUseOpenCL(False)


# Load pre-trained weights
model.load_weights('backend/model.h5')
facecasc = cv2.CascadeClassifier('backend/haarcascade_frontalface_default.xml')



# Function to fetch YouTube videos
def fetch_youtube_videos(query="funny videos", max_results=5):
    try:
        search = Search(query)
        videos = search.results  # Get all results
        random.shuffle(videos)  # Shuffle the results to make them random
        selected_videos = videos[:max_results]  # Pick the first 'max_results' from the shuffled list
        # Generate embed URLs for each video
        video_links = [f"https://www.youtube.com/embed/{video.video_id}?autoplay=1" for video in selected_videos]
        return video_links
    except Exception as e:
        return {"error": str(e)}

# Initialize FastAPI and Socket.IO
app = FastAPI()
sio = socketio.AsyncServer(async_mode='asgi', 
                           cors_allowed_origins='*')

# Mount the Socket.IO server to FastAPI
app.mount("/socket.io", socketio.ASGIApp(sio))

app.add_middleware(
    CORSMiddleware,
    allow_origins='*',
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# In-memory storage for lobbies
DATABASE_URL = os.getenv("DATABASE_URL")
DATABASE_KEY = os.getenv("DATABASE_KEY")
supabase: Client = create_client(DATABASE_URL, DATABASE_KEY)


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
    
    # lobbies[gameId] = {
    #     'admin': sid,
    #     'adminName': gameData['adminName'],
    #     'timer': gameData['timer'],
    #     'rounds': gameData['rounds'],
    #     'maxPlayers': gameData['players'],
    #     'players': [],
    #     'round_start_time': None
    # }

    # lobby = lobbies[gameId]
    player = {'name': gameData['adminName'], 'emotion_history': [(0, 0)]}
    lobbies[sid] = player
    # lobby['players'].append(player)

    response_creation = supabase.table('lobbies').insert({
        'game_id': gameId,
        'admin_sid': sid,
        'admin_name': gameData['adminName'],
        'timer': gameData['timer'],
        'rounds': gameData['rounds'],
        'max_players': gameData['players'],
        'round_start_time': None
    }).execute()

    response_join = supabase.table('players').insert({
        'player_id': sid,
        'game': gameId,
        'player_name': gameData['adminName'],
        'emotion_history': [(0, 0)]
    }).execute()

    try: 
        response_creation.raise_when_api_error
        print('Lobby created successfully')
    except Exception as e:
        print('Error creating lobby: ', e)

    try: 
        response_join.raise_when_api_error
        print('Admin joined successfully')
    except Exception as e:
        print('Error joining admin: ', e)

    # creates websocket room for all future emits
    await sio.enter_room(sid, gameId)
    await sio.emit('createGameResponse', {'success': True, 'gameId': gameId}, to=sid)

    # admin joining the game
    await sio.emit('playerJoined', player, room=gameId)
    await sio.emit('joinLobbyResponse', {'success': True, 'lobbyCode': gameId}, to=sid)

@sio.event
async def joinLobby(sid, data):
    lobbyCode = data['lobbyCode']
    playerName = data['playerName']

    print(f"Join Lobby Event Received: LobbyCode={lobbyCode}, PlayerName={playerName}")
    
    # lobby = lobbies.get(lobbyCode)
    lobby_info = supabase.table('lobbies').select().eq('game_id', lobbyCode).execute()
    players_info = supabase.table('players').select().eq('game', lobbyCode).execute()

    try:
        lobby_info.raise_when_api_error
        players_info.raise_when_api_error
        lobby_data = lobby_info.data[0]
        players_info = players_info.data
        if len(players_info) < lobby_data['max_players']:
            if not lobby_data['round_start_time']:
                player = {'name': playerName, 'emotion_history': [(0, 0)]}
                lobbies[sid] = player
                
                players_names = [player['player_name'] for player in players_info] + [playerName]

                response_join = supabase.table('players').insert({
                    'player_id': sid,
                    'game': lobbyCode,
                    'player_name': playerName,
                    'emotion_history': [(0, 0)]
                }).execute()
                
                # join player to the room
                await sio.enter_room(sid, lobbyCode)
                await sio.emit('playerJoined', player, room=lobbyCode, to=lobbyCode)

                # Emit successful join to the player
                await sio.emit('joinLobbyResponse', {'success': True, 'lobbyCode': lobbyCode, 'playerList': players_names}, to=sid)
            else:
                await sio.emit('joinLobbyResponse', {'success': False, 'message': 'Game already started, please wait until the game is finished.'}, to=sid)

        else:
            # Lobby full
            await sio.emit('joinLobbyResponse', {'success': False, 'message': 'Lobby is full.'}, to=sid)
        
    
    except Exception as e:
        # Lobby not found
        print('Error joining lobby: ', e)
        await sio.emit('joinLobbyResponse', {'success': False, 'message': 'Lobby not found.'}, to=sid)

@sio.event
async def startGame(sid, lobbyCode):

    lobby = supabase.table('lobbies').select().eq('game_id', lobbyCode).execute().data[0]
    players = supabase.table('players').select().eq('game', lobbyCode).execute().data
    if lobby and lobby['admin_sid'] == sid:
        # Emit 'gameStarted' to all players in the lobby
        response = supabase.table('lobbies').update({
            'round_start_time': time.time()
        }).eq('game_id', lobbyCode).execute()

        players_names = [player['player_name'] for player in players]
        settings = {
            'timer': lobby['timer'],
            'rounds': lobby['rounds'],
            'maxPlayers': lobby['max_players']
        }
        await sio.emit('gameStarted', {'gameSettings': settings, 'room': lobbyCode, 'players': players_names}, to=lobbyCode)
    else:
        # Unauthorized or lobby not found
        await sio.emit('startGameResponse', {'success': False, 'message': 'Unauthorized or lobby not found.'}, to=sid)
        # If the disconnected user was the admin, handle lobby closure

# Endpoint to fetch YouTube video links
@app.get("/fetch_videos")
async def get_videos():
    videos = fetch_youtube_videos()
    if "error" in videos:
        return {"success": False, "error": videos["error"]}
    return {"success": True, "videos": videos}

# Example root route
@app.get("/")
async def root():
    return {"message": "YouTube Video Fetcher is running."}

@sio.event
async def disconnect(sid):
    player_response = supabase.table("players").select("*").eq("player_id", sid).execute()
    if not player_response.data:
        print('no player found')
        return  # Player not found; nothing to do

    player = player_response.data[0]
    game_id = player["game"]

    # Check if the player is the admin of the lobby
    lobby_response = supabase.table("lobbies").select("*").eq("game_id", game_id).execute()
    if not lobby_response.data:
        print('no lobby found')
        return  # Lobby not found; nothing to do

    lobby = lobby_response.data[0]
    if lobby["admin_sid"] == sid:
        lobbies.pop(sid)
        supabase.table("lobbies").delete().eq("game_id", game_id).execute()
        print('lobby closed')
        await sio.emit('lobbyClosed', {'message': 'Lobby has been closed by the admin.'}, room=game_id)
    else:
        player_response = supabase.table("players").select("*").eq("player_id", sid).execute()
        player = player_response.data[0] if player_response.data else None
        lobbies.pop(sid)
        supabase.table("players").delete().eq("player_id", sid).execute()

        if player:
            await sio.emit("playerLeft", player, room=game_id)

    # Leave the Socket.IO room
    await sio.leave_room(sid, game_id)

# WebSocket route to handle webcam data and send back processing results
@sio.event
async def webcam_data(sid, data):
    lobby_code = data['lobbyCode']

    message = None

    try:
        lobby = supabase.table('lobbies').select('round_start_time').eq('game_id', lobby_code).execute().data[0]
        player = lobbies.get(sid)
        round_start_time = lobby['round_start_time']
        player_emotion_history = [
            entry for entry in player['emotion_history']
            if (time.time() - round_start_time - entry[0]) <= 3
        ]
        
        image = Image.open(BytesIO(data['image']))
        image_np = np.array(image)
        
        emotions = predict_emotion(image_np)
        print(emotions)
        if emotions != []:
            pred = 0 
            print(emotions)
            if emotions[0][3] > 0.8:
                pred = 1
            history_append = (time.time() - lobby['round_start_time'], pred)
            player_emotion_history.append(history_append)
            if len(player_emotion_history) > 10 and sum(item[1] for item in player_emotion_history) / len(player_emotion_history) > 0.2:
                message = 'roundLost'
                player_emotion_history = [(0, 0)]

            player['emotion_history'] = player_emotion_history
        
    except:
        pass

    await sio.emit('webcam_response', {'message': message}, to=sid)




def predict_emotion(frame: np.ndarray) -> list:
    preds = []
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    faces = facecasc.detectMultiScale(gray, scaleFactor=1.3, minNeighbors=5)

    for (x, y, w, h) in faces:
        # Draw a rectangle around the face
        cv2.rectangle(frame, (x, y-50), (x+w, y+h+10), (255, 0, 0), 2)

        # Process the region of interest
        roi_gray = gray[y:y + h, x:x + w]
        cropped_img = np.expand_dims(np.expand_dims(cv2.resize(roi_gray, (48, 48)), -1), 0)

        # Predict emotion
        prediction = model.predict(cropped_img, verbose=0)
        preds.append(prediction[0])

    return preds

# Run the FastAPI app
if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)  # Running on port 8000, as port 3000 is taken by npm start
