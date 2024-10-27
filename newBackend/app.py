
from flask import Flask, request, jsonify
from flask_cors import CORS
import base64
import os

app = Flask(__name__)
CORS(app)  # Enable CORS for cross-origin requests


UPLOAD_FOLDER = 'uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

@app.route('/upload-image', methods=['POST'])
def upload_image():
    try:
        # Get image data from the request
        image_data = request.json.get('image')

        if not image_data:
            return jsonify({"error": "No image data received"}), 400

        # Decode the base64 string to an image
        image_data = base64.b64decode(image_data)

        # Save the image to a file
        file_path = os.path.join(UPLOAD_FOLDER, 'uploaded_image.jpg')
        with open(file_path, 'wb') as f:
            f.write(image_data)

        return jsonify({"message": "Image received and saved."}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
