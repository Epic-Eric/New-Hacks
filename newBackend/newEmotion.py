import cv2
import numpy as np
from scipy.signal import find_peaks, savgol_filter

# Initialize the webcam
cap = cv2.VideoCapture(0)

# Load the pre-trained Haar Cascade classifier for face detection
face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')

# Store the last 'n' Eigenface projections
n = 10  # Default number of frames to track
last_n_projections = []
num_components = 50  # Number of components for PCA

# Parameters for peak detection and Savitzky-Golay filter
rmse_threshold = 0.005  # Threshold to detect significant change in rmse
window_length = 11  # Window length for Savitzky-Golay filter
polyorder = 2  # Polynomial order for Savitzky-Golay filter
recent_peak_frames = 4 * n  # Track recent peaks in the last 4 * n frames
recent_peaks = []  # List to track the frame indices where peaks occurred

main_history = []  # Store the main history of rmse values
smoothed_rmse_history = []  # Store the smoothed rmse values
detection_history = []  # Store the detection history

# Function to compute the Eigenfaces (PCA)
def compute_eigenfaces(images):
    data_matrix = np.array([img.flatten() for img in images])
    mean_face = np.mean(data_matrix, axis=0)
    centered_matrix = data_matrix - mean_face
    _, _, eigen_vectors = np.linalg.svd(centered_matrix, full_matrices=False)
    return mean_face, eigen_vectors


# Function to project the face into the Eigenface space
def project_to_eigenfaces(image, mean_face, eigen_vectors):
    centered_image = image.flatten() - mean_face
    weights = np.dot(centered_image, eigen_vectors.T)
    return weights


# Initialize a dummy image for Eigenfaces computation (For demonstration purposes)
# Normally, you would gather a set of training images.
dummy_face = np.zeros((200, 200), dtype=np.uint8)
mean_face, eigen_vectors = compute_eigenfaces([dummy_face])  # Replace this with your actual training images


# Function to blur the background while keeping the largest face sharp
def blur_background(frame, faces):
    # Create a blurred version of the frame
    blurred_frame = cv2.GaussianBlur(frame, (21, 21), 0)

    # Find the largest face based on the area (width * height)
    largest_face = max(faces, key=lambda f: f[2] * f[3])

    # Create a mask for the largest face region (the face will remain sharp)
    x, y, w, h = largest_face
    face_region = frame[y:y + h, x:x + w]

    # Replace the corresponding part of the blurred frame with the sharp face region
    blurred_frame[y:y + h, x:x + w] = face_region

    return blurred_frame, largest_face


# Start the frame capture loop
rmse_history = []  # Store rmse values
frame_count = 0  # To count frames for recent peak tracking

while True:
    ret, frame = cap.read()
    if not ret:
        break

    # Convert the frame to grayscale for face detection
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

    # Detect faces in the frame
    faces = face_cascade.detectMultiScale(gray, 1.1, 4)

    if len(faces) > 0:
        # Blur the background but keep the largest face sharp
        frame_with_blurred_background, largest_face = blur_background(frame, faces)

        # Resize the largest face to a consistent size (e.g., 200x200)
        x, y, w, h = largest_face
        face = gray[y:y + h, x:x + w]
        resized_face = cv2.resize(face, (200, 200))

        # Project the face into the Eigenface space
        current_projection = project_to_eigenfaces(resized_face, mean_face, eigen_vectors)

        # Add the current projection to the list of last 'n' projections
        last_n_projections.append(current_projection)
        if len(last_n_projections) > n:
            last_n_projections.pop(0)

        # Calculate the rmse with respect to the mean projection of the last 'n' frames
        if len(last_n_projections) > 1:
            avg_projection = np.mean(last_n_projections, axis=0)
            mse = np.mean((current_projection - avg_projection) ** 2)
        else:
            mse = 0  # No rmse to compute for the first frame
        rmse = np.sqrt(mse)

        rmse_history.append(rmse)
        if len(rmse_history) > n*4:
            rmse_history.pop(0)
        main_history.append(rmse)
        # Apply Savitzky-Golay filter to smooth the rmse signal
        if len(rmse_history) < 20:
            smoothed_rmse_history.append(None)
            detection_history.append(None)
        else:
            smoothed_rmse = savgol_filter(rmse_history, len(rmse_history), polyorder)
            smoothed_rmse_history.append(smoothed_rmse[-1])

            # Detect peaks in the smoothed rmse signal
            peaks, _ = find_peaks(smoothed_rmse, height=rmse_threshold)

            if len(peaks) > 0:
                detection_history.append(1)
                cv2.putText(frame_with_blurred_background, "Significant change detected!", (10, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
            else:
                detection_history.append(None)
            # Track recent peaks for a certain number of frames

            # Draw the face rectangle on the frame with blurred background
            cv2.rectangle(frame_with_blurred_background, (x, y), (x + w, y + h), (255, 0, 0), 2)

            # Display the rmse on the frame
            cv2.putText(frame_with_blurred_background, f'rmse: {rmse:.2f}', (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7,
                        (0, 255, 0), 2)
    else:
        frame_with_blurred_background = frame  # If no face is detected, just show the original frame

    # Display the frame with the blurred background
    cv2.imshow("Webcam Feed", frame_with_blurred_background)

    # Exit when 'q' is pressed
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

    frame_count += 1
# use matplotlib to plot the rmse history
import matplotlib.pyplot as plt

plt.plot(main_history, label="rmse")
plt.plot(smoothed_rmse_history, label="Smoothed rmse")
plt.scatter(np.linspace(0, len(detection_history), len(detection_history)),
            detection_history, color='red', label="Detection")
plt.xlabel("Frame")
plt.ylabel("rmse")
plt.legend()
plt.show()
# Release resources and close the window
cap.release()
cv2.destroyAllWindows()