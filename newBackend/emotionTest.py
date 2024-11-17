import time
import numpy as np
import argparse
import cv2
import cv2
import numpy as np
import argparse
import os
import matplotlib.pyplot as plt
from tflite_runtime.interpreter import Interpreter
# Suppress unnecessary logging
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'

class Colors:
    RED = '\033[91m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RESET = '\033[0m'

# Command line argument
ap = argparse.ArgumentParser()
ap.add_argument("--mode", help="train/display")
a = ap.parse_args()
mode = a.mode

# Initialize the TFLite interpreter
interpreter = Interpreter(model_path="model.tflite")
interpreter.allocate_tensors()

# Get input and output details
input_details = interpreter.get_input_details()
output_details = interpreter.get_output_details()

# Prevents OpenCL usage and unnecessary logging messages
cv2.ocl.setUseOpenCL(False)

# Dictionary which assigns each label an emotion (alphabetical order)
emotion_dict = {0: "Angry", 1: "Disgusted", 2: "Fearful", 3: "Happy", 4: "Neutral", 5: "Sad", 6: "Surprised"}
emotion_history = []

# Start the webcam feed
frame_rate = 5

def predict_emotion(frame: np.ndarray) -> list:
    """
    Predicts the emotion from a given frame.

    :param frame: The input frame from the webcam.
    :type frame: np.ndarray
    :return: list: A list of predictions for each detected face in the frame.
    """
    facecasc = cv2.CascadeClassifier('haarcascade_frontalface_default.xml')
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    faces = facecasc.detectMultiScale(gray, scaleFactor=1.3, minNeighbors=5)
    preds = []
    for (x, y, w, h) in faces:
        cv2.rectangle(frame, (x, y-50), (x+w, y+h+10), (255, 0, 0), 2)
        roi_gray = gray[y:y + h, x:x + w]
        cropped_img = np.expand_dims(np.expand_dims(cv2.resize(roi_gray, (48, 48)), -1), 0)
        cropped_img = cropped_img.astype(np.float32)  # Ensure type matches model input

        # Set the tensor for the input data
        interpreter.set_tensor(input_details[0]['index'], cropped_img)
        interpreter.invoke()

        # Get the output and determine the emotion
        prediction = interpreter.get_tensor(output_details[0]['index'])[0]
        preds.append(prediction)
        maxindex = int(np.argmax(prediction))
        cv2.putText(frame, emotion_dict[maxindex], (x+20, y-60), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2, cv2.LINE_AA)
    return preds

n: int | float = 3
# grace period for the client to be happy or surprised to adjust to the game
happySurpriseLast: list[float] = list()
cap = cv2.VideoCapture(0)
# 7 emotions: angry, disgusted, fearful, happy, neutral, sad, surprised
emojis = ["😠", "🤢", "😨", "😄", "😐", "😢", "😲"]
GamePhase = "Adjust"
prev: float = time.time()
start_Time: float = time.time()
no_face: float = time.time()
while time.time() - start_Time < n or len(happySurpriseLast) >= n * frame_rate / 3 or no_face - time.time() > 1:
    # time for client to adjust to the game
    time_elapsed = time.time() - prev
    if time_elapsed > 1. / frame_rate:
        prev = time.time()
    else:
        continue
    ret, frame = cap.read()
    if not ret:
        break
    emotions = predict_emotion(frame)
    if len(emotions) == 0:
        if time.time() - no_face > 1:
            print(f"{Colors.RED}❎ No face detected{Colors.RESET}")
            no_face = time.time()
    else:
        for i in emotions:
            if i[3] + i[6] >= 0.8:
                print(f"{Colors.YELLOW}❎ Adjust Your Face to Neutral{Colors.RESET}", end="")
                start_Time = time.time()
            else:
                print(f"{Colors.GREEN}✅ You Are Now at Neutral Face {Colors.RESET}", end="")
        print(f"{emojis[np.argmax(emotions[0])]}")
    cv2.imshow('Video', cv2.resize(frame, (1600, 960), interpolation=cv2.INTER_CUBIC))
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break
# wait for other player to adjust their face



# TODO: Implement the game phase where the client has to keep a neutral face for n seconds.



GamePhase = "Game"
print(f"{Colors.GREEN}✅ Face Adjusted, Game Start! {Colors.RESET}")
prev: float = time.time()
start_Time: float = time.time()
no_face: float = time.time()
while True:
    time_elapsed = time.time() - prev
    if time_elapsed > 1. / frame_rate:
        prev = time.time()
    else:
        continue
    ret, frame = cap.read()
    flag = False
    if not ret:
        break
    emotions = predict_emotion(frame)
    if len(emotions) == 0:
        if time.time() - no_face > 1:
            print(f"{Colors.RED}❎ No face detected{Colors.RESET}")
            no_face = time.time()
    for i in emotions:
        if i[3] + i[6] >= 0.8:
            flag = True
            emotion_history.append(time.time() - start_Time)
    if flag:
        index = 0
        happySurpriseLast.append(time.time() - start_Time)
        for i in range(len(happySurpriseLast)):
            if time.time() - start_Time - happySurpriseLast[i] > n:
                index = i
                break
            else:
                break
        happySurpriseLast = happySurpriseLast[index:]
        if len(happySurpriseLast) >= n * frame_rate / 3:
            print(f"{Colors.RED}❌ You Lose {Colors.RESET}")
            break
    flag = False
    cv2.imshow('Video', cv2.resize(frame, (1600, 960), interpolation=cv2.INTER_CUBIC))
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()

for i in emotion_history:
    plt.scatter(i, 0)
plt.show()
