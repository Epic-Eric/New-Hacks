import os 

import socketio
import secrets
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import base64
import numpy as np
from io import BytesIO
from PIL import Image
import time

# from test import get_eigenFace_mse


import time
from typing import Literal

import numpy as np
import cv2
from keras_core.models import Sequential
from keras_core.layers import Dense, Dropout, Flatten
from keras_core.layers import Conv2D, MaxPooling2D

# import matplotlib.pyplot as plt
# Suppress unnecessary logs
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'

# Define Colors for CLI output
class Colors:
    RED = '\033[91m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RESET = '\033[0m'

# Command-line arguments
# ap = argparse.ArgumentParser()
# ap.add_argument("--mode", help="train/display")
# a = ap.parse_args()
# mode = a.mode

# Create the model
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

# Emotion dictionary and history
emotion_dict: dict[int, str] = {0: "Angry", 1: "Disgusted", 2: "Fearful", 3: "Happy", 4: "Neutral", 5: "Sad", 6: "Surprised"}
emotion_history: list[float] = []

# Frame rate for webcam
frame_rate: int | float = 5

# Load pre-trained weights
model.load_weights('newBackend/model.h5')

# Function to predict emotion
def predict_emotion(frame: np.ndarray) -> list:
    """
    Predicts the emotion from a given frame.

    :param frame: The input frame from the webcam.
    :type frame: np.ndarray
    :return: A list of predictions for each detected face in the frame.
    :rtype: list
    """
    facecasc = cv2.CascadeClassifier('newBackend/haarcascade_frontalface_default.xml')
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    faces = facecasc.detectMultiScale(gray, scaleFactor=1.3, minNeighbors=5)
    preds = []

    for (x, y, w, h) in faces:
        # Draw a rectangle around the face
        cv2.rectangle(frame, (x, y-50), (x+w, y+h+10), (255, 0, 0), 2)

        # Process the region of interest
        roi_gray = gray[y:y + h, x:x + w]
        cropped_img = np.expand_dims(np.expand_dims(cv2.resize(roi_gray, (48, 48)), -1), 0)

        # Predict emotion
        prediction = model.predict(cropped_img, verbose=0)
        preds.append(prediction[0])

        # Get emotion with max probability
        maxindex = int(np.argmax(prediction))
        cv2.putText(frame, emotion_dict[maxindex], (x+20, y-60), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2, cv2.LINE_AA)

    return preds

def predict_from_face(face: np.ndarray) -> Literal["Angry", "Disgusted", "Fearful", "Happy", "Neutral", "Sad", "Surprised"]:
    prediction = model.predict(face, verbose=0)
    maxindex = int(np.argmax(prediction))
    return emotion_dict[maxindex]


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
        'players': [],
        'round_start_time': None
    }
    lobby = lobbies[gameId]
    player = {'id': sid, 'name': gameData['adminName'], 'emotion_history': [(0, 0)]}
    lobby['players'].append(player)
    # Admin joins the lobby room
    await sio.enter_room(sid, gameId)

    # Emit 'createGameResponse' back to the admin client
    await sio.emit('createGameResponse', {'success': True, 'gameId': gameId}, to=sid)

    await sio.emit('playerJoined', player, room=gameId)

    # Emit successful join to the player
    await sio.emit('joinLobbyResponse', {'success': True, 'lobbyCode': gameId}, to=sid)

@sio.event
async def joinLobby(sid, data):
    lobbyCode = data['lobbyCode']
    playerName = data['playerName']
    print(f"Join Lobby Event Received: LobbyCode={lobbyCode}, PlayerName={playerName}")
    
    lobby = lobbies.get(lobbyCode)
    if lobby:
        if len(lobby['players']) < lobby['settings']['maxPlayers']:
            if not lobby['round_start_time']:
                player = {'id': sid, 'name': playerName, 'emotion_history': [(0, 0)]}
                lobby['players'].append(player)

                players_names = [player['name'] for player in lobby['players']]
                await sio.enter_room(sid, lobbyCode)

                # Emit 'playerJoined' to the lobby room
                await sio.emit('playerJoined', player, room=lobbyCode, to=lobbyCode)

                # Emit successful join to the player
                await sio.emit('joinLobbyResponse', {'success': True, 'lobbyCode': lobbyCode, 'playerList': players_names}, to=sid)
            else:
                await sio.emit('joinLobbyResponse', {'success': False, 'message': 'Game already started, please wait until the game is finished.'}, to=sid)

        else:
            # Lobby full
            await sio.emit('joinLobbyResponse', {'success': False, 'message': 'Lobby is full.'}, to=sid)
        
    
    else:
        # Lobby not found
        await sio.emit('joinLobbyResponse', {'success': False, 'message': 'Lobby not found.'}, to=sid)

@sio.event
async def startGame(sid, lobbyCode):

    lobby = lobbies.get(lobbyCode)
    if lobby and lobby['admin'] == sid:
        # Emit 'gameStarted' to all players in the lobby
        lobby['round_start_time'] = time.time()
        players_names = [player['name'] for player in lobby['players']]
        await sio.emit('gameStarted', {'gameSettings': lobby['settings'], 'room': lobbyCode, 'players': players_names}, to=lobbyCode)
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


# WebSocket route to handle webcam data and send back processing results
@sio.event
async def webcam_data(sid, data):
    # Process the webcam data (base64 image)
    print(f'data received: {data}')
    lobby_code = data['lobbyCode']
    lobby = lobbies.get(lobby_code)

    base64_data = data['image'].split(",")[1]
    # Decode the base64 image
    image_data = base64.b64decode(base64_data)
    player_number = 0
    for i, player in enumerate(lobby['players']):
        if player['id'] == sid:
            player_number = i
    message = None

    try:
        lobby['players'][player_number]['emotion_history'] = [
            entry for entry in lobby['players'][player_number]['emotion_history']
            if (time.time() - lobby['round_start_time'] - entry[0]) <= 4
        ]
        
        image = Image.open(BytesIO(image_data))
        # Convert to OpenCV format
        image_np = np.array(image)

        emotions = predict_emotion(image_np)

        if emotions != []:
            pred = 0 
            if emotions[0][3] + emotions[0][6] > 0.8:
                pred = 1
            history_append = (time.time() - lobby['round_start_time'], pred)
            lobby['players'][player_number]['emotion_history'].append(history_append)
            if sum(item[1] for item in lobby['players'][player_number]['emotion_history']) / len(lobby['players'][player_number]['emotion_history']) > 0.3:
                message = 'roundLost'
        
    except:
        pass

    await sio.emit('webcam_response', {'message': message}, to=sid)


# Run the FastAPI app
# if __name__ == "__main__":
#     uvicorn.run(app, host="127.0.0.1", port=8000)  # Running on port 8000, as port 3000 is taken by npm start


        # lobby['players'][player_number]['emotion_history'] = [
        #         entry for entry in lobby['players'][player_number]['emotion_history']
        #         if (time.time() - lobby['round_start_time'] - entry[0]) <= 6
        # ]

        # history = lobby['players'][player_number]['emotion_history']
        # result= get_eigenFace_mse(image_np, history)
        
        # if result != None:
        #     history_append, game_over = (time.time() - lobby['round_start_time'], result[0]), result[1]
        #     print('face detected')
        #     if game_over == True:
        #         message = 'roundLost'
        # else:
        #     history_append = (time.time() - lobby['round_start_time'], (None, []))
        #     print('still no face detected')     
        # lobby['players'][player_number]['emotion_history'].append(history_append)