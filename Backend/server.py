# server.py

from flask import Flask, request, jsonify
import os
from werkzeug.utils import secure_filename
from datetime import datetime
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Directory to save images
SAVE_DIRECTORY = 'captured_images'

# Ensure the save directory exists
if not os.path.exists(SAVE_DIRECTORY):
    os.makedirs(SAVE_DIRECTORY)

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/save_image', methods=['POST'])
def save_image():
    if 'image' not in request.files:
        return jsonify({'success': False, 'message': 'No image part in the request'}), 400

    file = request.files['image']

    if file.filename == '':
        return jsonify({'success': False, 'message': 'No selected file'}), 400

    if file and allowed_file(file.filename):
        # Secure the filename
        filename = secure_filename(file.filename)
        # Add timestamp to filename to ensure uniqueness
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S_%f')
        unique_filename = f"{timestamp}_{filename}"
        file_path = os.path.join(SAVE_DIRECTORY, unique_filename)
        file.save(file_path)
        print(f"Image saved: {file_path}")
        return jsonify({'success': True, 'filePath': file_path}), 200

    return jsonify({'success': False, 'message': 'Unsupported file type'}), 400

if __name__ == '__main__':
    app.run(port=5001, debug=True)
