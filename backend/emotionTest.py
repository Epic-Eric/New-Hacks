import time

import numpy as np
import argparse
import cv2
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Dense, Dropout, Flatten
from tensorflow.keras.layers import Conv2D
from tensorflow.keras.layers import MaxPooling2D
import os
import matplotlib.pyplot as plt
os.environ['TF_CPP_MIN_LOG_LEVEL']: str = '2'

# command line argument
ap = argparse.ArgumentParser()
ap.add_argument("--mode",help="train/display")
a = ap.parse_args()
mode = a.mode
# Create the model
model = Sequential()

model.add(Conv2D(32, kernel_size=(3, 3), activation='relu', input_shape=(48,48,1)))
model.add(Conv2D(64, kernel_size=(3, 3), activation='relu'))
model.add(MaxPooling2D(pool_size=(2, 2)))
model.add(Dropout(0.25))

model.add(Conv2D(128, kernel_size=(3, 3), activation='relu'))
model.add(MaxPooling2D(pool_size=(2, 2)))
model.add(Conv2D(128, kernel_size=(3, 3), activation='relu'))
model.add(MaxPooling2D(pool_size=(2, 2)))
model.add(Dropout(0.25))

model.add(Flatten())
model.add(Dense(1024, activation='relu'))
model.add(Dropout(0.5))
model.add(Dense(7, activation='softmax'))



# prevents openCL usage and unnecessary logging messages
cv2.ocl.setUseOpenCL(False)
# dictionary which assigns each label an emotion (alphabetical order)
emotion_dict = {0: "Angry", 1: "Disgusted", 2: "Fearful", 3: "Happy", 4: "Neutral", 5: "Sad", 6: "Surprised"}
emotion_history = list()
# start the webcam feed
frame_rate = 5
prev, start_Time, no_face = time.time(), time.time(), time.time()
model.load_weights('backend/model.h5')
def predict_emotion(frame: np.ndarray) -> list:
    """
    Predicts the emotion from a given frame.

    :param: frame: The input frame from the webcam.
    :type: frame: np.ndarray
    :return: list: A list of predictions for each detected face in the frame.
    """
    global no_face
    facecasc = cv2.CascadeClassifier('backend/haarcascade_frontalface_default.xml')
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    faces = facecasc.detectMultiScale(gray, scaleFactor=1.3, minNeighbors=5)
    preds = []
    if len(faces) == 0:
        if time.time() - no_face > 1:
            print("No face detected")
            no_face = time.time()
    for (x, y, w, h) in faces:
        cv2.rectangle(frame, (x, y-50), (x+w, y+h+10), (255, 0, 0), 2)
        roi_gray = gray[y:y + h, x:x + w]
        cropped_img = np.expand_dims(np.expand_dims(cv2.resize(roi_gray, (48, 48)), -1), 0)
        prediction = model.predict(cropped_img)
        preds.append(prediction[0])
        maxindex = int(np.argmax(prediction))
        cv2.putText(frame, emotion_dict[maxindex], (x+20, y-60), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2, cv2.LINE_AA)
    return preds
# if the model results the client is happy or surprised in the last n seconds for 1/2 of the time, then the client loses

n = 3
# grace period for the client to be happy or surprised to adjust to the game
happySurpriseLast = list()
cap = cv2.VideoCapture(0)
while time.time() - start_Time < n or len(happySurpriseLast)  >= n*frame_rate/2:
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
    for i in emotions:
        if i[3] + i[6] >= 0.8:
            print("Adjust Your Face")
    cv2.imshow('Video', cv2.resize(frame, (1600, 960), interpolation=cv2.INTER_CUBIC))
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break
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
    for i in emotions:
        if i[3] + i[6] >= 0.8:
            flag = True
            emotion_history.append(time.time() - start_Time)
    if flag:
        index = 0
        happySurpriseLast.append(time.time() - start_Time)
        for i in range(len(happySurpriseLast)):
            if time.time() - start_Time -  happySurpriseLast[i] > n:
                index = i
                break
            else:
                break
        happySurpriseLast = happySurpriseLast[index:]
        if len(happySurpriseLast)  >= n*frame_rate/2:
            print("Client loses")
            break
    flag = False
    cv2.imshow('Video', cv2.resize(frame, (1600, 960), interpolation=cv2.INTER_CUBIC))
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break


cap.release()
cv2.destroyAllWindows()

# with matplot lib, graph time on the x axis spanning from min emotion to max emtion, vertical lines if there is a time where maxindex is 3

for i in emotion_history:
    plt.scatter(i, 3)
plt.show()

