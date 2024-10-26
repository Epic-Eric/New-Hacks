import cv2
from deepface import DeepFace
import time

cap = cv2.VideoCapture(1)

if not cap.isOpened():
    print("Error: Could not open webcam.")
    exit()


last_record_time = 0
record_interval = 1
recorded_data = []

# Process the webcam feed frame by frame
while True:
    # Capture frame-by-frame
    ret, frame = cap.read()
    
    if not ret:
        print("Error: Could not read frame.")
        break

    # Resize frame to improve performance
    resized_frame = cv2.resize(frame, (640, 480))

    try:
        

        # Get the current time
        current_time = time.time()

        # Check if 0.5 seconds have passed since the last recorded data
        if current_time - last_record_time >= record_interval:
            result = DeepFace.analyze(resized_frame, actions=['gender', 'emotion',], enforce_detection=False)
            print(type(result))
            result_1 = result[0]
            print(result_1)
            print(type(result_1))
            # Update the last record time
            last_record_time = current_time
            
            # Record the analyzed result in the list
            recorded_data.append({
                'time': current_time,  # You can add a timestamp
                'gender': result_1['gender'],
                'emotion': result_1['dominant_emotion']
            })

        # Display the results on the frame
        
        font = cv2.FONT_HERSHEY_SIMPLEX
        text = f"Gender: {result_1['gender']}, Emotion: {result_1['dominant_emotion']}"
        
        cv2.putText(frame, text, (50, 50), font, 1, (255, 0, 0), 2, cv2.LINE_AA)

    except Exception as e:
        print(f"Error during analysis: {e}")

    # Display the resulting frame with annotations
    cv2.imshow('Webcam - DeepFace Real-Time', frame)

    # Exit when 'q' is pressed
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

# Release the capture and close windows
cap.release()
cv2.destroyAllWindows()