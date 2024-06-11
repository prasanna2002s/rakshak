from email.message import EmailMessage
import ssl
import smtplib
import boto3
from twilio.rest import Client
import time
import cv2
import numpy as np
import mediapipe as mp
import tensorflow as tf
from keras.models import load_model


email_sender = "prodduturisourabhbharadwaj.20.cse@anits.edu.in"
email_password = "itvi glrl aqmg tfwy"
email_receiver = "sourabhnerd@gmail.com"
subject = " Image Captured!"


# Initialize counter for captured images
image_count = 0

# Initialize Twilio client
twilio_client = Client('AC5531081c65abc8b207be4bd19bd6545b', 'ae0e4a988978c4764f16a8ab0d871dca')

# Initialize AWS S3 client
s3 = boto3.client('s3')

# Initialize MediaPipe
mpHands = mp.solutions.hands
hands = mpHands.Hands(max_num_hands=1, min_detection_confidence=0.7)
mpDraw = mp.solutions.drawing_utils

# Load the gesture recognizer model
model = load_model("mp_hand_gesture")

# Load class names
with open('gesture.names', 'r') as f:
    classNames = f.read().split('\n')

# Initialize the webcam
cap = cv2.VideoCapture(0)

# Flag to indicate when to stop capturing images
capture_complete = False

while not capture_complete:
    # Read each frame from the webcam
    _, frame = cap.read()

    x, y, c = frame.shape

    # Flip the frame vertically
    frame = cv2.flip(frame, 1)
    framergb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

    # Get hand landmark prediction
    result = hands.process(framergb)

    # Post-process the result
    className = ''
    if result.multi_hand_landmarks:
        landmarks = []
        for handslms in result.multi_hand_landmarks:
            for lm in handslms.landmark:
                lmx = int(lm.x * x)
                lmy = int(lm.y * y)
                landmarks.append([lmx, lmy])

            # Drawing landmarks on frames
            mpDraw.draw_landmarks(frame, handslms, mpHands.HAND_CONNECTIONS)

            # Predict gesture
            prediction = model.predict([landmarks])
            classID = np.argmax(prediction)
            if classID == 5:
                className = classNames[classID]
                if image_count < 4:
                    cv2.imwrite(f'Resources/Images/image{image_count}.jpg', frame)
                    s3.upload_file(f"Resources/Images/image{image_count}.jpg", "sou1", f"folder/image{image_count}.jpeg", ExtraArgs={'ContentType': 'image/jpeg', 'ACL': 'public-read'})
                    image_count += 1
                    time.sleep(2)
                    # Send message using Twilio
                    wtsp_msg = twilio_client.messages.create(
                        to='whatsapp:+918309344861',
                        from_='whatsapp:+14155238886',
                        body=f"{image_count}th photo captured!",
                        media_url=[f"https://sou1.s3.ap-south-1.amazonaws.com/folder/image{image_count-1}.jpeg"]
                    )
                    sms_msg = twilio_client.messages.create(
                        to='+918309344861',
                        from_='+15642342908',
                        body=f"{image_count}th photo captured!",
                        media_url=[f"https://sou1.s3.ap-south-1.amazonaws.com/folder/image{image_count-1}.jpeg"]
                    )
                    print(sms_msg.body)
                    print(wtsp_msg.body)

                    body = f"""
                            Hello,
                            These are the images captured:
                            https://sou1.s3.ap-south-1.amazonaws.com/folder/image{image_count-1}.jpeg
                            """

                    em = EmailMessage()
                    em['From'] = email_sender
                    em['To'] = email_receiver
                    em['Subject'] = subject
                    em.set_content(body)

                    with open(f"Resources/Images/image{image_count-1}.jpg", 'rb') as f:
                        file_data = f.read()
                        file_name = f"{image_count-1}.jpg"
                    em.add_attachment(file_data, maintype="image", subtype="jpeg", filename=file_name)
                    
                    # Establish a secure connection context
                    context = ssl.create_default_context()
                    
                    # Send email
                    with smtplib.SMTP_SSL("smtp.gmail.com", 465, context=context) as smtp:
                        smtp.login(email_sender, email_password)
                        smtp.sendmail(email_sender, email_receiver, em.as_string())
                else:
                    # Set flag to indicate capture is complete
                    capture_complete = True
                    break

    # Show the final output
    cv2.imshow("Output", frame)

    if cv2.waitKey(1) == ord('q'):
        check = True
        break

# Release the webcam and destroy all active windows
cap.release()
cv2.destroyAllWindows()

