# Face Detector Backend 🌐

The Face Detector Backend is a Flask application that provides face detection capabilities using OpenCV. This backend processes images uploaded from the frontend and returns the results.

## Requirements 📦

To run this backend, you need the following Python packages:

```
blinker==1.9.0
click==8.1.8
colorama==0.4.6
Flask==3.1.0
Flask-Cors==5.0.0
itsdangerous==2.2.0
Jinja2==3.1.5
MarkupSafe==3.0.2
numpy==2.2.3
opencv-python==4.11.0.86
pillow==11.1.0
Werkzeug==3.1.3
```

You can install these dependencies using:

```
pip install -r requirements.txt
```

## Installation 🚀

1. **Clone the Repository**

   Open your terminal and run:
   ```
   git clone https://github.com/AmalRaghk/Face_Detection.git
   ```

2. **Navigate to the Backend Directory**

   ```
   cd face-detector-backend
   ```

3. **(Optional) Create and Activate a Virtual Environment**

   For Unix/macOS:
   ```
   python3 -m venv venv
   source venv/bin/activate
   ```

   For Windows:
   ```
   python -m venv venv
   venv\Scripts\activate
   ```

4. **Install Dependencies**

   ```
   pip install -r requirements.txt
   ```

## Usage 💻

1. **Start the Flask Server**

   Launch the application by running:
   ```
   python app.py
   ```

2. **Access the API**

   The backend will be running at:
   ```
   http://localhost:5000
   ```

You can send requests to this endpoint to utilize the face detection features.

## License 📄

This project is licensed under the MIT License. For more details, see the LICENSE file.
