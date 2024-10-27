# from flask import Flask, render_template
# from flask_socketio import SocketIO
# import base64
# import cv2
# import numpy as np
# from emotionTest import predict_emotion  # Import your model function

# app = Flask(__name__)
# socketio = SocketIO(app)

# @app.route('/')
# def index():
#     # Serve the HTML file with the client-side webcam code
#     return render_template('index.html')

from flask import Flask, render_template, request, Response
from flask_socketio import SocketIO
import base64
import cv2
import numpy as np
from emotionTest import predict_emotion  # Import your model function

app = Flask(__name__)

@app.route('/')
def index():

    # Serve the HTML file with the client-side webcam code
    return render_template('index.html')

@app.route('/receive_frame', methods=['POST'])
def receive_frame():
    # Get the image file from the POST request
    file = request.files['frame'].read()

    # Convert the byte data to a numpy array and decode the image
    npimg = np.frombuffer(file, np.uint8)
    img = cv2.imdecode(npimg, cv2.IMREAD_COLOR)

    # You can process the image here (e.g., run your model on the frame)
    emotion = predict_emotion(img)
    print(emotion)
    condition = False
    # Just to check, save the frame to verify it's working
    cv2.imwrite('received_frame.jpg', img)
    if condition:
        return Response(status=200, response='Smile detected')
    return Response(status=200, response='No smile detected')

if __name__ == '__main__':
    app.run(debug=True)
# import sys
# from deepface import DeepFace
# from PIL import Image

# def detect_smile(image_path):
#     img = Image.open(image_path)



#     try:
#         emotion = predict_emotion(img)


#     except Exception as e:
#         print(f"Error: {str(e)}", file=sys.stderr)
#         return False

# if __name__ == "__main__":
#     image_path = sys.argv[1]  # Get image path from the command line argument
#     if detect_smile(image_path):
#         print("smile_detected")
#     else:
#         print("no_smile")
