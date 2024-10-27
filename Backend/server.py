# server.py

from flask import Flask, request, jsonify
import os
from datetime import datetime

app = Flask(__name__)

# Directory to save images
SAVE_DIRECTORY = 'captured_images'

# Ensure the save directory exists
if not os.path.exists(SAVE_DIRECTORY):
    os.makedirs(SAVE_DIRECTORY)

@app.route('/save_image', methods=['POST'])
def save_image():
    if 'image' not in request.files:
        return jsonify({'success': False, 'message': 'No image part in the request'}), 400

    file = request.files['image']

    if file.filename == '':
        return jsonify({'success': False, 'message': 'No selected file'}), 400

    if file:
        # Optionally, validate the file type
        if not allowed_file(file.filename):
            return jsonify({'success': False, 'message': 'Unsupported file type'}), 400

        # Save the file with a unique name
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S_%f')
        filename = f"{timestamp}_{secure_filename(file.filename)}"
        file_path = os.path.join(SAVE_DIRECTORY, filename)
        file.save(file_path)

        return jsonify({'success': True, 'filePath': file_path}), 200

    return jsonify({'success': False, 'message': 'File not saved'}), 500

def allowed_file(filename):
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

from werkzeug.utils import secure_filename

if __name__ == '__main__':
    app.run(port=5001, debug=True)