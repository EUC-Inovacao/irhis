import os
import base64
import json
from flask import Flask, jsonify, request
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
import jwt as PyJWT
from datetime import datetime, timedelta, timezone
from functools import wraps
import zipfile
import io
import csv

app = Flask(__name__)
CORS(app)
app.config['SECRET_KEY'] = 'your-secret-key'  

hashed_password_doctor = generate_password_hash('password')

users = {
    'doc1': {
        "id": "doc1",
        "email": "doctor@demo.com",
        "password": hashed_password_doctor,
        "role": "doctor",
        "name": "Dr. Smith"
    },
    '1': { "id": "1", "email": "john.doe@demo.com", "password": generate_password_hash('password'), "role": "patient", "name": "John Doe" },
    '2': { "id": "2", "email": "jane.smith@demo.com", "password": generate_password_hash('password'), "role": "patient", "name": "Jane Smith" },
    '3': { "id": "3", "email": "robert.johnson@demo.com", "password": generate_password_hash('password'), "role": "patient", "name": "Robert Johnson" },
    '4': { "id": "4", "email": "emily.williams@demo.com", "password": generate_password_hash('password'), "role": "patient", "name": "Emily Williams" },
    '5': { "id": "5", "email": "michael.brown@demo.com", "password": generate_password_hash('password'), "role": "patient", "name": "Michael Brown" },
    '6': { "id": "6", "email": "sarah.davis@demo.com", "password": generate_password_hash('password'), "role": "patient", "name": "Sarah Davis" },
    '7': { "id": "7", "email": "david.wilson@demo.com", "password": generate_password_hash('password'), "role": "patient", "name": "David Wilson" }
}

default_patient_details = {
    "age": 0, "sex": "N/A", "height": 0, "weight": 0, "bmi": 0,
    "clinicalInfo": "No information provided."
}

patients = {
    '1': { 
        "id": '1', 
        "name": 'John Doe', 
        "recovery_process": [
            { "id": "rp1", "name": "Knee Bends", "completed": True, "targetRepetitions": 12, "targetSets": 3, "instructions": "Go slow and steady." },
            { "id": "rp2", "name": "Leg Raises", "completed": False, "targetRepetitions": 15, "targetSets": 3, "instructions": "Keep your leg straight." },
        ],
        "details": {
            "age": 65, "sex": "Male", "height": 1.8, "weight": 85, "bmi": 26.2,
            "clinicalInfo": "Post-op recovery from total knee replacement. Reports mild pain and swelling."
        },
        "feedback": [
            {
                "sessionId": "weekly_1703123456789",
                "timestamp": "2023-12-21T10:30:00.000Z",
                "pain": 3,
                "fatigue": 4,
                "difficulty": 5,
                "comments": "Feeling much better this week. Pain has decreased significantly."
            }
        ]
    },
    '2': { 
        "id": '2', 
        "name": 'Jane Smith', 
        "recovery_process": [
            { "id": "rp3", "name": "Shoulder Pendulum", "completed": True, "targetRepetitions": 10, "targetSets": 4, "instructions": "Let your arm hang and swing gently." },
        ],
        "details": {
            "age": 42, "sex": "Female", "height": 1.65, "weight": 60, "bmi": 22.0,
            "clinicalInfo": "ACL reconstruction on the left knee. Currently non-weight bearing."
        },
        "feedback": [
            {
                "sessionId": "weekly_1703123456790",
                "timestamp": "2023-12-20T14:15:00.000Z",
                "pain": 6,
                "fatigue": 7,
                "difficulty": 8,
                "comments": "Still experiencing some pain during exercises. Need to take more breaks."
            }
        ]
    },
    '3': { 
        "id": '3', 
        "name": 'Robert Johnson', 
        "recovery_process": [],
        "details": {
            "age": 58, "sex": "Male", "height": 1.75, "weight": 95, "bmi": 31.0,
            "clinicalInfo": "Chronic osteoarthritis in both knees. Focus on pain management and mobility."
        }
    },
    '4': { "id": '4', "name": 'Emily Williams', "recovery_process": [], "details": default_patient_details },
    '5': { "id": '5', "name": 'Michael Brown', "recovery_process": [], "details": default_patient_details },
    '6': { 
        "id": '6', 
        "name": 'Sarah Davis', 
        "recovery_process": [
            { "id": "rp4", "name": "Hip Abduction", "completed": False, "targetRepetitions": 10, "targetSets": 3, "instructions": "Keep your back straight." },
        ],
        "details": {
            "age": 35, "sex": "Female", "height": 1.68, "weight": 62, "bmi": 22.0,
            "clinicalInfo": "Post-hip surgery recovery. Working on range of motion."
        }
    },
    '7': { 
        "id": '7', 
        "name": 'David Wilson', 
        "recovery_process": [
            { "id": "rp5", "name": "Ankle Circles", "completed": True, "targetRepetitions": 20, "targetSets": 2, "instructions": "Move slowly in both directions." },
            { "id": "rp6", "name": "Calf Raises", "completed": False, "targetRepetitions": 15, "targetSets": 3, "instructions": "Hold for 3 seconds at the top." },
        ],
        "details": {
            "age": 45, "sex": "Male", "height": 1.82, "weight": 78, "bmi": 23.5,
            "clinicalInfo": "Ankle sprain recovery. Focus on stability and strength."
        }
    }
}

doctors_patients = {
    'doc1': ['1', '2', '3'] 
}

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            token = request.headers['Authorization'].split(' ')[1]

        if not token:
            return jsonify({'error': 'Token is missing'}), 401
        
        try:
            data = PyJWT.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])
            current_user = users.get(data['user_id'])
            if not current_user:
                return jsonify({'error': 'Invalid token'}), 401
        except Exception as e:
            return jsonify({'error': 'Invalid token', 'details': str(e)}), 401
            
        return f(current_user, *args, **kwargs)
    return decorated

@app.route("/")
def home():
    return "irhis Backend"

@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    role = data.get('role')

    if not email or not password or not role:
        return jsonify({"error": "Missing email, password, or role"}), 400

    # Find user by email
    user = next((user for user in users.values() if user['email'] == email), None)
    
    if not user or not check_password_hash(user['password'], password):
        return jsonify({"error": "Invalid credentials"}), 401

    # Verify role matches
    if user['role'] != role:
        return jsonify({"error": "Invalid role for this user"}), 401

    # Generate token
    token = PyJWT.encode({
        'user_id': user['id'],
        'exp': datetime.now(timezone.utc) + timedelta(days=1)
    }, app.config['SECRET_KEY'])

    return jsonify({
        "token": token,
        "user": {
            "id": user['id'],
            "email": user['email'],
            "name": user['name'],
            "role": user['role']
        }
    })

@app.route('/signup', methods=['POST'])
def signup():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    role = data.get('role')
    name = data.get('name')

    if not all([email, password, role, name]):
        return jsonify({"error": "Missing required fields"}), 400

    # Check if email already exists
    if any(user['email'] == email for user in users.values()):
        return jsonify({"error": "Email already registered"}), 409

    # Create new user
    user_id = str(len(users) + 1)
    hashed_password = generate_password_hash(password)
    
    users[user_id] = {
        "id": user_id,
        "email": email,
        "password": hashed_password,
        "role": role,
        "name": name
    }

    if role == 'patient':
        patients[user_id] = {
            "id": user_id,
            "name": name,
            "recovery_process": [],
            "details": default_patient_details
        }
    elif role == 'doctor':
        doctors_patients[user_id] = []

    # Generate token
    token = PyJWT.encode({
        'user_id': user_id,
        'exp': datetime.now(timezone.utc) + timedelta(days=1)
    }, app.config['SECRET_KEY'])

    return jsonify({
        "token": token,
        "user": {
            "id": user_id,
            "email": email,
            "name": name,
            "role": role
        }
    })

@app.route('/me', methods=['GET'])
@token_required
def get_current_user(current_user):
    return jsonify(current_user)

@app.route('/patients/<patient_id>', methods=['GET'])
@token_required
def get_patient(current_user, patient_id):
    # Check if user has access to this patient
    if current_user['role'] != 'doctor' and current_user['id'] != patient_id:
        return jsonify({"error": "Unauthorized"}), 403

    patient = patients.get(patient_id)
    if patient:
        return jsonify(patient)
    return jsonify({"error": "Patient not found"}), 404

@app.route('/doctors/<doctor_id>/patients', methods=['GET'])
@token_required
def get_doctor_patients(current_user, doctor_id):
    if current_user['role'] != 'doctor' or current_user['id'] != doctor_id:
        return jsonify({"error": "Unauthorized"}), 403

    return jsonify(list(patients.values()))

@app.route('/patients/unassigned', methods=['GET'])
@token_required
def get_unassigned_patients(current_user):
    if current_user['role'] != 'doctor':
        return jsonify({"error": "Unauthorized"}), 403
    
    assigned_patient_ids = {patient_id for patient_list in doctors_patients.values() for patient_id in patient_list}
    
    unassigned_patients = [
        patient for patient_id, patient in patients.items() 
        if patient_id not in assigned_patient_ids
    ]
    
    return jsonify(unassigned_patients)

@app.route('/patients/<patient_id>/assign-doctor', methods=['POST'])
@token_required
def assign_doctor(current_user, patient_id):
    if current_user['role'] != 'doctor':
        return jsonify({"error": "Only doctors can assign patients"}), 403

    if patient_id not in patients:
        return jsonify({"error": "Patient not found"}), 404

    doctor_id = current_user['id']
    if doctor_id not in doctors_patients:
        doctors_patients[doctor_id] = []
    
    if patient_id not in doctors_patients[doctor_id]:
        doctors_patients[doctor_id].append(patient_id)

    return jsonify({"message": "Patient assigned successfully"})

@app.route('/patients/<patient_id>/recovery-process', methods=['PUT'])
@token_required
def update_recovery_process(current_user, patient_id):
    if current_user['role'] != 'doctor':
        return jsonify({"error": "Only doctors can update exercises"}), 403

    if patient_id not in patients:
        return jsonify({"error": "Patient not found"}), 404
    
    data = request.get_json()
    if not isinstance(data, list):
        return jsonify({"error": "Invalid data format, expected a list of exercises"}), 400
    
    patients[patient_id]['recovery_process'] = data
    
    return jsonify(patients[patient_id])

@app.route('/patients/<patient_id>/details', methods=['PUT'])
@token_required
def update_patient_details(current_user, patient_id):
    if current_user['role'] != 'doctor':
        return jsonify({"error": "Only doctors can update patient details"}), 403

    if patient_id not in patients:
        return jsonify({"error": "Patient not found"}), 404

    data = request.get_json()
    if not data:
        return jsonify({"error": "Missing data"}), 400

    patient_details = patients[patient_id].get('details', {})
    patient_details.update(data)
    patients[patient_id]['details'] = patient_details
    
    if 'weight' in data or 'height' in data:
        weight = patient_details.get('weight', 0)
        height = patient_details.get('height', 0)
        if height > 0 and weight > 0:
            patients[patient_id]['details']['bmi'] = weight / (height * height)

    return jsonify(patients[patient_id])

@app.route('/patients/<patient_id>/feedback', methods=['PUT'])
@token_required
def update_patient_feedback(current_user, patient_id):
    print(f"Feedback request - User: {current_user['id']}, Role: {current_user['role']}, Patient: {patient_id}")
    
    # Allow both patients and doctors to update feedback
    if current_user['role'] == 'patient' and current_user['id'] != patient_id:
        return jsonify({"error": "Patients can only update their own feedback"}), 403

    if patient_id not in patients:
        print(f"Patient {patient_id} not found in patients data")
        return jsonify({"error": "Patient not found"}), 404

    data = request.get_json()
    print(f"Received data: {data}")
    
    if not data or 'feedback' not in data:
        return jsonify({"error": "Missing feedback data"}), 400

    # Initialize feedback array if it doesn't exist
    if 'feedback' not in patients[patient_id]:
        patients[patient_id]['feedback'] = []
    
    # Add new feedback to the array
    if isinstance(data['feedback'], list):
        patients[patient_id]['feedback'].extend(data['feedback'])
    else:
        patients[patient_id]['feedback'].append(data['feedback'])

    print(f"Updated patient {patient_id} with feedback")
    return jsonify(patients[patient_id])

# Movement Analysis API Integration
MOVEMENT_API_BASE_URL = "https://eucp-movement-analysis-api-dev.azurewebsites.net"

@app.route('/movement/health', methods=['GET'])
@token_required
def check_movement_api_health(current_user):
    """Check if the external movement analysis API is healthy"""
    try:
        import requests
        response = requests.get(f"{MOVEMENT_API_BASE_URL}/health", timeout=10)
        if response.status_code == 200:
            return jsonify({"status": "ok", "external_api": response.json()})
        else:
            return jsonify({"status": "error", "message": "External API not responding"}), 503
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 503

@app.route('/movement/analyze', methods=['POST'])
@token_required
def analyze_movement_data(current_user):
    """Upload and analyze movement data using external API"""
    try:
        import requests
        
        # Check if file is present in request
        if 'file' not in request.files:
            return jsonify({"error": "No file provided"}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({"error": "No file selected"}), 400
        
        # Get additional parameters
        patient_id = request.form.get('patient_id')
        exercise_type = request.form.get('exercise_type', 'general')
        
        # Validate patient access
        if current_user['role'] == 'patient' and current_user['id'] != patient_id:
            return jsonify({"error": "Patients can only analyze their own data"}), 403
        
        if current_user['role'] == 'doctor' and patient_id:
            # Check if doctor has access to this patient
            if patient_id not in patients:
                return jsonify({"error": "Patient not found"}), 404
        
        # Forward file to external API
        files = {'file': (file.filename, file.stream, file.content_type)}
        
        response = requests.post(
            f"{MOVEMENT_API_BASE_URL}/analyze",
            files=files,
            timeout=60  # Longer timeout for analysis
        )
        
        if response.status_code == 200:
            analysis_result = response.json()
            
            # Store analysis result in patient data if patient_id provided
            if patient_id and patient_id in patients:
                if 'movement_analyses' not in patients[patient_id]:
                    patients[patient_id]['movement_analyses'] = []
                
                analysis_record = {
                    'id': f"analysis_{datetime.now().timestamp()}",
                    'timestamp': datetime.now().isoformat(),
                    'exercise_type': exercise_type,
                    'file_name': file.filename,
                    'result': analysis_result,
                    'analyzed_by': current_user['id']
                }
                
                patients[patient_id]['movement_analyses'].append(analysis_record)
            
            return jsonify({
                "success": True,
                "message": "Analysis completed successfully",
                "result": analysis_result
            })
        else:
            return jsonify({
                "success": False,
                "message": "External API analysis failed",
                "error": response.text
            }), 502
            
    except Exception as e:
        return jsonify({
            "success": False,
            "message": "Analysis failed",
            "error": str(e)
        }), 500

@app.route('/patients/<patient_id>/movement-analyses', methods=['GET'])
@token_required
def get_patient_movement_analyses(current_user, patient_id):
    """Get movement analysis history for a patient"""
    # Check if user has access to this patient
    if current_user['role'] != 'doctor' and current_user['id'] != patient_id:
        return jsonify({"error": "Unauthorized"}), 403

    patient = patients.get(patient_id)
    if not patient:
        return jsonify({"error": "Patient not found"}), 404
    
    analyses = patient.get('movement_analyses', [])
    return jsonify({"analyses": analyses})

@app.route('/movement/test-integration', methods=['GET'])
@token_required
def test_movement_integration(current_user):
    """Test integration with external movement analysis API"""
    try:
        import requests
        response = requests.get(f"{MOVEMENT_API_BASE_URL}/integration_test", timeout=10)
        
        if response.status_code == 200:
            return jsonify({
                "success": True,
                "message": "Integration test passed",
                "external_api_response": response.json()
            })
        else:
            return jsonify({
                "success": False,
                "message": "Integration test failed",
                "status_code": response.status_code
            }), 502
            
    except Exception as e:
        return jsonify({
            "success": False,
            "message": "Integration test failed",
            "error": str(e)
        }), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    debug = os.environ.get('FLASK_ENV') == 'development'
    app.run(host='0.0.0.0', port=port, debug=debug) 