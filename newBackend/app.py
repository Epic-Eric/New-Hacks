
from flask import Flask, request, jsonify
from flask_cors import CORS, cross_origin
import base64
import os
from PIL import Image
from emotionTest import predict_emotion
import numpy as np

app = Flask(__name__)
CORS(app)  # Enable CORS for cross-origin requests


@app.route('/upload-image', methods=['POST', 'OPTIONS'])
@cross_origin()
def upload_image():
    try:
        if request.method == "OPTIONS":
            return _build_cors_preflight_response()  # Preflight request handling
        # Get image data from the request
        image_data = request.json.get('image')
        name = request.json.get('name')
        UPLOAD_FOLDER = os.getcwd() + f'/newBackend/uploads/{name}/'
        if not os.path.exists(UPLOAD_FOLDER):
            os.makedirs(UPLOAD_FOLDER)

        if not image_data:
            return jsonify({"error": "No image data received"}), 400
        print(type(image_data))
        # Decode the base64 string to an image
        image_data = base64.b64decode(image_data)

        # Save the image to a file
        file_path = os.path.join(UPLOAD_FOLDER, 'uploaded_image.jpg')
        with open(file_path, 'wb') as f:
            f.write(image_data)
        print(type(image_data))
        # convert image to a (bgr) numpy matrix
        image_data = Image.open(file_path)
        
        # print(len(image_data))
        image_data = np.array(image_data)
        emotion = predict_emotion(image_data)
        print('emotion predicted:')
        print(emotion)

        return jsonify(emotion), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Helper function to build CORS preflight response
def _build_cors_preflight_response():
    response = jsonify({'message': 'CORS preflight successful'})
    response.headers.add("Access-Control-Allow-Origin", "*")
    response.headers.add("Access-Control-Allow-Headers", "Content-Type")
    response.headers.add("Access-Control-Allow-Methods", "POST, OPTIONS")
    return response

if __name__ == '__main__':
    app.run(debug=True)
