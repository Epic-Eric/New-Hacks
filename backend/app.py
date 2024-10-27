from flask import Flask, render_template
from flask_socketio import SocketIO
import base64
import cv2
import numpy as np
from emotionTest import predict_emotion  # Import your model function

app = Flask(__name__)
socketio = SocketIO(app)

@app.route('/')
def index():
    # Serve the HTML file with the client-side webcam code
    return render_template('index.html')
from flask import Flask, render_template
from flask_socketio import SocketIO
import base64
import cv2
import numpy as np
from emotionTest import predict_emotion  # Import your model function

app = Flask(__name__)
socketio = SocketIO(app)

@app.route('/')
def index():

    # Serve the HTML file with the client-side webcam code
    return render_template('index.html')

@socketio.on('frame')
def handle_frame(data):
    # Decode the base64 image from the client
    frame_data = base64.b64decode(data.split(",")[1])
    np_arr = np.frombuffer(frame_data, np.uint8)
    frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

    # Process the frame with the emotion detection model
    emotion = predict_emotion(frame)

    # Send the emotion back to the client
    socketio.emit('emotion', emotion)

if __name__ == '__main__':
    socketio.run(app, host="0.0.0.0", port=5009, allow_unsafe_werkzeug=True)