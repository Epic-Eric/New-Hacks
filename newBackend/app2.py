from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
import asyncio
import base64
import cv2
import numpy as np
from io import BytesIO
from PIL import Image
from emotionTest import predict_emotion
import os
import socketio

app = FastAPI()

# Simulated game state (you can replace this with real game logic)
game_state = {
    "players": ["Alice", "Bob"],
    "scores": {"Alice": 0, "Bob": 0},
    "status": "ongoing"
}

current_dir = os.path.dirname(__file__)  # Get the current directory of the Python file
static_dir = os.path.join(current_dir, "static")  # Point to the "static" folder

# Serve the game HTML
app.mount("/static", StaticFiles(directory=static_dir), name="static")


@app.get("/")
async def read_index():
    return HTMLResponse(open(static_dir + "/frontend_test.html").read())


# WebSocket manager to handle multiple clients
class WebSocketManager:
    def __init__(self):
        self.active_connections = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        print('someone new joined the server')

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)
        print('someone disconnected')

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            await connection.send_text(message)

manager = WebSocketManager()

# Function to process base64 webcam data
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

        return f"emotion predicted: {emotion}"
        
    except Exception as e:
        return str(e)


# WebSocket route to handle webcam data and send back processing results
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            response_message = process_webcam_data(data)
            await manager.broadcast(response_message)  # Broadcast the result to all clients
    except WebSocketDisconnect:
        manager.disconnect(websocket)

# Run the FastAPI app with Uvicorn
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)




