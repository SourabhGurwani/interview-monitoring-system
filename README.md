# Focus & Object Detection System

A comprehensive AI-powered system for monitoring focus and detecting prohibited objects during video interviews or online exams.

![Focus Detection System](https://img.shields.io/badge/Status-Active-brightgreen)
![Node.js](https://img.shields.io/badge/Node.js-16.x-green)
![MongoDB](https://img.shields.io/badge/MongoDB-5.x-green)
![License](https://img.shields.io/badge/License-MIT-blue)

## ✨ Features

- **Real-time Face Detection**: Uses MediaPipe for accurate face detection and tracking
- **Focus Monitoring**: Tracks when a user looks away or leaves the frame
- **Object Detection**: Utilizes TensorFlow.js and COCO-SSD to detect prohibited objects (phones, books, etc.)
- **Event Logging**: Records all detection events with timestamps and severity levels
- **Session Management**: Start/stop interview sessions with detailed reporting
- **Backend Integration**: Node.js/Express server with MongoDB for data persistence

## 🛠️ Technology Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **AI Libraries**: MediaPipe Face Detection, TensorFlow.js, COCO-SSD
- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose ODM
- **Additional**: CORS, dotenv

## 📦 Installation

### Prerequisites

- Node.js (v14 or higher)
- MongoDB (local installation or MongoDB Atlas account)
- Modern web browser with camera access

### Setup Steps

1. **Clone the repository**
   ```bash
   git clone <your-repository-url>
   cd focus-detection-system
Install backend dependencies

bash
cd backend
npm install
Set up environment variables

bash
# Create .env file in backend directory
echo "MONGODB_URI=mongodb://localhost:27017/focus-detection" > .env
echo "PORT=3000" >> .env
Start MongoDB

bash
# If using local MongoDB
mongod

# Or use MongoDB Atlas cloud service
Run the application

bash
npm run dev
Access the application
Open your browser and navigate to http://localhost:3000

🚀 Usage
Start the Camera: Click "Start Camera" to begin video capture

Begin Session: Enter candidate name and click "Start Interview Session"

Monitoring: The system will automatically detect:

Faces in the frame

Looking away from camera

Multiple people detected

Prohibited objects (phones, books, etc.)

View Events: All detection events are logged in the Event Log panel

End Session: Click "End Interview Session" to generate a summary report

📊 API Endpoints
Method	Endpoint	Description
POST	/api/session/start	Start a new interview session
POST	/api/session/end	End a session and generate report
GET	/api/session/:id	Get session details
POST	/api/event	Log a new detection event
GET	/api/event/session/:sessionId	Get events for a session
📁 Project Structure
text
focus-detection-system/
├── backend/
│   ├── models/
│   │   ├── Session.js
│   │   └── Event.js
│   ├── routes/
│   │   ├── session.js
│   │   └── event.js
│   ├── public/
│   │   ├── index.html
│   │   ├── styles.css
│   │   └── app.js
│   ├── .env
│   ├── package.json
│   └── server.js
├── .gitignore
└── README.md
⚙️ Configuration
Adjusting Detection Sensitivity
Modify the threshold values in public/script.js:

javascript
// Thresholds (in milliseconds)
const NO_FACE_THRESHOLD = 10000; // 10 seconds
const LOOKING_AWAY_THRESHOLD = 5000; // 5 seconds

// Suspicious object classes
const SUSPICIOUS_OBJECTS = ['cell phone', 'book', 'laptop', 'mouse', 'keyboard', 'remote'];
Adding New Prohibited Objects
Add new object classes to the SUSPICIOUS_OBJECTS array. Refer to the COCO-SSD model documentation for available class names.

🐛 Troubleshooting
Common Issues
Camera access denied

Ensure your browser has permission to access the camera

Use HTTPS in production environments

MongoDB connection errors

bash
# Verify MongoDB is running
sudo systemctl status mongod

# Check connection string in .env file
AI models not loading

Check internet connection (models are loaded from CDN)

Verify browser supports WebGL for TensorFlow.js

Browser Compatibility
Browser	Minimum Version	Notes
Chrome	80	Full support
Firefox	75	Full support
Safari	13	Limited WebGL support
Edge	80	Full support
🤝 Contributing
We welcome contributions! Please follow these steps:

Fork the repository

Create a feature branch (git checkout -b feature/amazing-feature)

Commit your changes (git commit -m 'Add some amazing feature')

Push to the branch (git push origin feature/amazing-feature)

Open a Pull Request

Development Guidelines
Follow JavaScript ES6+ standards

Use meaningful variable and function names

Comment complex logic sections

Test changes across different browsers

📄 License
This project is licensed under the MIT License - see the LICENSE file for details.

🙏 Acknowledgments
MediaPipe for face detection capabilities

TensorFlow.js team for object detection models

COCO-SSD for pre-trained object detection

📞 Support
If you have any questions or issues:

Check the Troubleshooting section

Search existing GitHub Issues

Create a new Issue with detailed information

🔮 Future Enhancements
Multi-user support

Advanced analytics dashboard

Export session reports

Mobile app version

Integration with video conferencing platforms

Note: This system is designed for ethical monitoring purposes. Always inform participants when using monitoring software and ensure compliance with local privacy laws and regulations.
