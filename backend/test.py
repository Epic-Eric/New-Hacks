from typing import Optional

import cv2
import numpy as np
from scipy.signal import find_peaks, savgol_filter

# COLLECT LAST ~40 FRAMES

# Initialize the webcam
# cap = cv2.VideoCapture(0)

face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')

# Parameters for peak detection and Savitzky-Golay filter
THRESHOLD = 0.005  # Threshold to detect significant change in rmse
POLYORDER = 2  # Polynomial order for Savitzky-Golay filter

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

def rmse_peak_detection(currMSE: float, rmseHistory: list[float], threshold: float = THRESHOLD, polyorder: int = POLYORDER) -> bool:
    """
    Function to detect significant changes in the face appearance based on the rMSE signal

    :param currMSE: the current rMSE value
    :param rmseHistory: the history of rMSE values
    :param threshold: the threshold for peak detection
    :param polyorder: the polynomial order for the Savitzky-Golay filter
    :return: bool: True if a significant change is detected, False otherwise
    """
    rmseHistory.append(currMSE)

    if len(rmseHistory) < 10:
        return False

    smoothed_rmse = savgol_filter(rmseHistory, len(rmseHistory), polyorder)
    peaks, _ = find_peaks(smoothed_rmse, height=threshold)

    if len(peaks) > 0:
        return True

    return False

def get_eigenFace_mse(frame: np.ndarray, history: list[tuple[float, tuple[Optional[float], list[float]]]]) -> Optional[tuple[tuple[Optional[float], list[float]], bool]]:
    """
    Function to compute the Eigenfaces and the rMSE, and detect significant changes in the face appearance. Main trigger from the server

    :param frame: np.ndarray: The frame from the webcam
    :param history: list[tuple[float, tuple[float, list[float]]]: The history of the rMSE and the projections
            [(t0, (None, proj0)), (t1, (rmse1, proj1)), ...]
    :return: tuple[tuple[float, list[float]], bool]: The MSE and the detection flag or None if no face is detected

            result = get_eigenFace_mse(frame, currTime, history)

            assert result is not None # Please handle no face detected

            rmse: float, proj: list[float] = result[0]
            isDetected: bool = result[1]

            time = (ur way of getting time)
            history.append( (time, (rmse, proj))) )
            # save history
            # react to isDetected
    """
    # Convert the frame to grayscale for face detection
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

    # Detect faces in the frame
    faces = face_cascade.detectMultiScale(gray, 1.1, 4)

    rmse_history = [rmse if (rmse:= i[1][0]) is not None else 0 for i in history]
    projection_history = [i[1][1] for i in history]

    ret = (0.0, [])
    isDetected = False

    if len(faces) > 0:
        frame_with_blurred_background, largest_face = blur_background(frame, faces)

        # Resize the largest face to a consistent size (e.g., 200x200)
        x, y, w, h = largest_face
        face = gray[y:y + h, x:x + w]
        resized_face = cv2.resize(face, (200, 200))

        # Project the face into the EigenFace space
        current_projection = project_to_eigenfaces(resized_face, mean_face, eigen_vectors)

        if len(projection_history) > 0:
            avg_projection = np.mean(projection_history, axis=0)
            currentRMSE = np.sqrt(np.mean((current_projection - avg_projection) ** 2))
            isDetected = rmse_peak_detection(currentRMSE, rmse_history)

        else:
            currentRMSE = None

        return (currentRMSE, current_projection), isDetected
    else:
        return None

def display_frame(frame: np.ndarray, text: str = "") -> None:
    """
    Function to display the frame with an optional text overlay

    Will detect a face and blur the background, then display the frame with the text overlay

    :param frame: np.ndarray: The frame to display
    :param text: str: The text to overlay on the frame
    """
    faces = face_cascade.detectMultiScale(cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY), 1.1, 4)
    if len(faces) > 0:
        frame_with_blurred_background, _ = blur_background(frame, faces)
        cv2.putText(frame_with_blurred_background, text, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
        cv2.imshow('Webcam', frame_with_blurred_background)
    else:
        cv2.imshow('Webcam', frame)


