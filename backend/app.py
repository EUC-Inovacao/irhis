import os
import base64
import json
import jwt as PyJWT
import zipfile
import io
import csv

from flask import Flask, jsonify, request
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta, timezone
from functools import wraps
from db import (
    is_db_enabled,
    list_doctor_patients,
    list_unassigned_patients,
    assign_patient_to_doctor,
    get_doctor_patient_ids,
    get_user_by_id,
    get_user_for_login,
    get_patient_sessions,
    assign_session_to_patient,
    get_patient_doctor_relation,
    get_session_by_id,
    update_session_details,
    delete_patient_session,
    create_manual_patient,
    insert_session_metrics,
    get_metrics_by_session,
    get_metrics_by_patient
)


app = Flask(__name__)
CORS(app)
app.config['SECRET_KEY'] = 'your-secret-key'  

hashed_password_doctor = generate_password_hash('password')


default_patient_details = {
    "age": 0, "sex": "N/A", "height": 0, "weight": 0, "bmi": 0,
    "clinicalInfo": "No information provided."
}


def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None

        if 'Authorization' in request.headers:
            parts = request.headers['Authorization'].split(' ')
            if len(parts) == 2:
                token = parts[1]

        if not token:
            return jsonify({'error': 'Token is missing'}), 401

        try:
            data = PyJWT.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])
            user_data = get_user_by_id(str(data['user_id']))
            
            if not user_data:
                return jsonify({'error': 'Invalid token'}), 401

            current_user = {
                'id': str(user_data.get('ID')),
                'role': user_data.get('Role'),
                'email': user_data.get('Email'),
                'name': f"{user_data.get('FirstName','')} {user_data.get('LastName','')}".strip()
            }

        except Exception as e:
            return jsonify({'error': 'Invalid token'}), 401

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

    if not is_db_enabled():
        return jsonify({"error": "Database not configured"}), 500

    user = get_user_for_login(email, role)

    if not user:
        return jsonify({"error": "Invalid credentials"}), 401

    if not check_password_hash(user["Password"], password):
        return jsonify({"error": "Invalid credentials"}), 401

    token = PyJWT.encode(
        {
            "user_id": str(user["ID"]),
            "role": user["Role"],
            "exp": datetime.now(timezone.utc) + timedelta(days=1),
        },
        app.config["SECRET_KEY"],
        algorithm="HS256",
    )

    return jsonify({
        "token": token,
        "user": {
            "id": str(user["ID"]),
            "email": user["Email"],
            "name": f"{user.get('FirstName','')} {user.get('LastName','')}".strip(),
            "role": user["Role"],
        }
    }), 200


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
    if current_user['role'].lower() != 'doctor' or current_user['id'].lower() != doctor_id:
        return jsonify({"error": "Unauthorized"}), 403

    if not is_db_enabled():
        return jsonify({"error": "Database not configured"}), 500

    rows = list_doctor_patients(doctor_id)
    return jsonify([
        {
            "id": r["id"],
            "name": r.get("name") or "",
            "recovery_process": [],
            "details": default_patient_details,
        }
        for r in rows
    ])


@app.route('/doctors/me/patients', methods=['GET'])
@token_required
def get_doctors_me_patients(current_user):
    if current_user['role'].lower() != 'doctor':
        return jsonify({"error": "Unauthorized"}), 403

    if not is_db_enabled():
        return jsonify({"error": "Database not configured"}), 500

    doctor_id = current_user['id']
    search = request.args.get('search', '').lower()
    sort = request.args.get('sort', 'name')

    rows = list_doctor_patients(doctor_id)

    items = []
    for r in rows:
        name = (r.get("name") or "").strip()

        if search and search not in name.lower():
            continue

        items.append({
            "type": "patient",
            "id": str(r["id"]),
            "name": name,
            "email": r.get("email") or "",
            "nif": "",
            "status": "Confirmed",

            "lastSessionAt": None,
            "lastFeedbackAt": None,
            "sessionCount": 0,
            "lastAvgROM": None,
            "lastAvgVelocity": None,
        })

    if sort == "name":
        items.sort(key=lambda x: x.get("name", ""))

    return jsonify({
        "items": items,
        "confirmed": items,
        "pending": [],
    })


@app.route('/patients/unassigned', methods=['GET'])
@token_required
def get_unassigned_patients(current_user):
    if current_user['role'].lower() != 'doctor':
        return jsonify({"error": "Unauthorized"}), 403

    if not is_db_enabled():
        return jsonify({"error": "Database not configured"}), 500

    rows = list_unassigned_patients()
    return jsonify([
        {
            "id": str(r["id"]),
            "name": r.get("name") or "",
            "recovery_process": [],
            "details": default_patient_details,
        }
        for r in rows
    ])





@app.route('/patients/<patient_id>/assign-doctor', methods=['POST'])
@token_required
def assign_doctor(current_user, patient_id):
    if current_user['role'].lower() != 'doctor':
        return jsonify({"error": "Only doctors can assign patients"}), 403

    doctor_id = current_user['id']

    if not is_db_enabled():
        return jsonify({"error": "Database not configured"}), 500

    assign_patient_to_doctor(patient_id, doctor_id)
    return jsonify({"message": "Patient assigned successfully"})

@app.route('/patients/<patient_id>/recovery-process', methods=['PUT'])
@token_required
def update_recovery_process(current_user, patient_id):
    if current_user['role'].lower() != 'doctor':
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
    if current_user['role'].lower() != 'doctor':
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

@app.route('/doctors/me/metrics-summary', methods=['GET'])
@token_required
def get_doctors_me_metrics_summary(current_user):
    if current_user['role'].lower() != 'doctor':
        return jsonify({"error": "Unauthorized"}), 403
    
    doctor_id = current_user['id']

    if not is_db_enabled():
        return jsonify({"error": "Database not configured"}), 500
    
    patient_ids = get_doctor_patient_ids(doctor_id)
    
    metrics_summary = []
    for patient_id in patient_ids:
        if patient_id not in patients:
            continue
        
        patient = patients[patient_id]
        movement_analyses = patient.get('movement_analyses', [])
        
        for analysis in movement_analyses:
            result = analysis.get('result', {})
            if isinstance(result, dict):
                # Extract metrics
                joint = result.get('joint', 'Unknown')
                side = result.get('side', '')
                avg_rom = result.get('avgROM') or result.get('rom')
                avg_velocity = result.get('avgVelocity') or result.get('velocity')
                
                metrics_summary.append({
                    "patientId": patient_id,
                    "patientName": patient.get('name', ''),
                    "joint": joint,
                    "side": side,
                    "avgROM": avg_rom,
                    "avgVelocity": avg_velocity,
                    "date": analysis.get('timestamp', ''),
                    "exerciseType": analysis.get('exercise_type', 'general')
                })
    
    # Sort by date (most recent first) and return top 5
    metrics_summary.sort(key=lambda x: x.get('date', ''), reverse=True)
    return jsonify(metrics_summary[:5])

@app.route('/doctors/me/recent-activity', methods=['GET'])
@token_required
def get_doctors_me_recent_activity(current_user):
    if current_user['role'].lower() != 'doctor':
        return jsonify({"error": "Unauthorized"}), 403
    
    doctor_id = current_user['id']

    if not is_db_enabled():
        return jsonify({"error": "Database not configured"}), 500

    patient_ids = get_doctor_patient_ids(doctor_id)
    
    # Calculate date 7 days ago
    seven_days_ago = datetime.now(timezone.utc) - timedelta(days=7)
    
    recent_activity = []
    for patient_id in patient_ids:
        if patient_id not in patients:
            continue
        
        patient = patients[patient_id]
        patient_name = patient.get('name', '')
        
        # Get feedback from last 7 days
        feedback_list = patient.get('feedback', [])
        for feedback in feedback_list:
            timestamp_str = feedback.get('timestamp')
            if not timestamp_str:
                continue
            
            try:
                feedback_date = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
                if feedback_date >= seven_days_ago:
                    recent_activity.append({
                        "type": "feedback",
                        "patientId": patient_id,
                        "patientName": patient_name,
                        "label": f"Pain: {feedback.get('pain', 'N/A')}/10, Fatigue: {feedback.get('fatigue', 'N/A')}/10",
                        "date": timestamp_str,
                        "sessionId": feedback.get('sessionId')
                    })
            except:
                pass
        
        # Get sessions from movement_analyses (last 7 days)
        movement_analyses = patient.get('movement_analyses', [])
        for analysis in movement_analyses:
            timestamp_str = analysis.get('timestamp')
            if not timestamp_str:
                continue
            
            try:
                analysis_date = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
                if analysis_date >= seven_days_ago:
                    exercise_type = analysis.get('exercise_type', 'general')
                    recent_activity.append({
                        "type": "session",
                        "patientId": patient_id,
                        "patientName": patient_name,
                        "label": f"Exercise: {exercise_type}",
                        "date": timestamp_str,
                        "sessionId": analysis.get('id')
                    })
            except:
                pass
    
    # Sort by date (most recent first) and return top 5
    recent_activity.sort(key=lambda x: x.get('date', ''), reverse=True)
    return jsonify(recent_activity[:5])

@app.route('/doctors/me/trends', methods=['GET'])
@token_required
def get_doctors_me_trends(current_user):
    if current_user['role'].lower() != 'doctor':
        return jsonify({"error": "Unauthorized"}), 403
    
    doctor_id = current_user['id']
    if not is_db_enabled():
        return jsonify({"error": "Database not configured"}), 500

    patient_ids = get_doctor_patient_ids(doctor_id)
    
    # Calculate date 30 days ago
    thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
    
    pain_scores = []
    fatigue_scores = []
    difficulty_scores = []
    
    for patient_id in patient_ids:
        if patient_id not in patients:
            continue
        
        feedback_list = patients[patient_id].get('feedback', [])
        for feedback in feedback_list:
            timestamp_str = feedback.get('timestamp')
            if not timestamp_str:
                continue
            
            try:
                feedback_date = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
                if feedback_date >= thirty_days_ago:
                    if 'pain' in feedback:
                        pain_scores.append(feedback['pain'])
                    if 'fatigue' in feedback:
                        fatigue_scores.append(feedback['fatigue'])
                    if 'difficulty' in feedback:
                        difficulty_scores.append(feedback['difficulty'])
            except:
                pass
    
    # Calculate averages
    avg_pain = sum(pain_scores) / len(pain_scores) if pain_scores else 0
    avg_fatigue = sum(fatigue_scores) / len(fatigue_scores) if fatigue_scores else 0
    avg_difficulty = sum(difficulty_scores) / len(difficulty_scores) if difficulty_scores else 0
    
    return jsonify({
        "avgPain": round(avg_pain, 2),
        "avgFatigue": round(avg_fatigue, 2),
        "avgDifficulty": round(avg_difficulty, 2)
    })

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

@app.route('/patients/manual-registry', methods=['POST'])
@token_required
def register_patient_manual(current_user):
    if current_user['role'].lower() != 'doctor':
        return jsonify({"error": "Acesso negado"}), 403

    data = request.json
    doctor_id = current_user['id'] 

    required_fields = [
        'first_name', 'birth_date', 'sex', 'weight', 'height', 'bmi',
        'affected_right_knee', 'affected_left_knee', 
        'affected_right_hip', 'affected_left_hip', 'leg_dominance'
    ]
    
    missing = [field for field in required_fields if data.get(field) is None]
    if missing:
        return jsonify({"error": f"Campos obrigatórios ausentes: {', '.join(missing)}"}), 400

    try:
        user_info = {
            'first_name': data.get('first_name'), 
            'last_name': data.get('last_name', '')
        }
        
        user_id, email = create_manual_patient(user_info, data, doctor_id)
        
        return jsonify({
            "message": "Paciente registrado e vinculado com sucesso",
            "patient_id": user_id,
            "generated_email": email
        }), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/patients/<patient_id>/sessions', methods=['POST'])
@token_required
def assign_patients_sessions(current_user, patient_id):
    if current_user['role'].lower() != 'doctor':
        return jsonify({"error": "Only doctors can assign exercises"}), 403

    doctor_id = current_user['id']

    relation = get_patient_doctor_relation(patient_id, doctor_id)
    
    if not relation:
        return jsonify({"error": "Patient not associated with this doctor"}), 403
    
    relation_id = relation['ID']

    data = request.json
    if not data:
        return jsonify({"error": "No data provided"}), 400
    
    try:
        assign_session_to_patient(
            relation_id=relation_id,
            exercise_type=data.get('exercise_type'),
            exercise_description=data.get('exercise_description'),
            repetitions=data.get('repetitions'),
            duration=data.get('duration')
        )
        return jsonify({"message": "Session assigned successfully"}), 201
    except Exception as e:
        return jsonify({"error": f"Failed to assign session: {str(e)}"}), 500

@app.route('/patients/<patient_id>/sessions', methods=['GET'])
@token_required
def get_patients_sessions(current_user, patient_id):
    try:
        sessions = get_patient_sessions(patient_id)
        
        if sessions is None:
            return jsonify({"message": "Nenhuma sessão encontrada"}), 404
            
        return jsonify(sessions), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
@app.route('/sessions/<session_id>', methods=['GET'])
@token_required
def get_session(current_user, session_id):
    session = get_session_by_id(session_id)

    if not session:
        return jsonify({"error": "Session not found"}), 404
    
    if current_user['role'].lower() == 'doctor':
        doctor_id = current_user['id']
        patient_id = session['PatientID'] 

        relation = get_patient_doctor_relation(patient_id, doctor_id)
    
        if not relation:
            return jsonify({"error": "Patient not associated with this doctor"}), 403
    
    return jsonify(session), 200

@app.route('/sessions/<session_id>', methods=['PUT'])
@token_required
def update_session(current_user, session_id):

    if current_user['role'].lower() != 'doctor':
        return jsonify({"error": "Unauthorized"}), 403

    data = request.json
    if not data:
        return jsonify({"error": "No data provided"}), 400

    session = get_session_by_id(session_id)

    if not session:
        return jsonify({"error": "Session not found"}), 404
    
    if current_user['role'].lower() == 'doctor':
        doctor_id = current_user['id']
        patient_id = session['PatientID'] 

        relation = get_patient_doctor_relation(patient_id, doctor_id)
    
        if not relation:
            return jsonify({"error": "Patient not associated with this doctor"}), 403

    try:
        update_session_details(
            session_id=session_id,
            exercise_type=data.get('exercise_type'),
            exercise_description=data.get('exercise_description'),
            repetitions=data.get('repetitions'),
            duration=data.get('duration')
        )
        return jsonify({"message": "Session updated successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/sessions/<session_id>', methods=['DELETE'])
@token_required
def delete_session(current_user, session_id):
    if current_user['role'].lower() != 'doctor':
        return jsonify({"error": "Unauthorized"}), 403

    session = get_session_by_id(session_id)
    if not session:
        return jsonify({"error": "Session not found"}), 404

    try:
        delete_patient_session(session_id)
        return jsonify({"message": "Session deleted successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/sessions/<session_id>/metrics', methods=['POST'])
@token_required
def post_session_metrics(current_user, session_id):

    data = request.json
    if not data:
        return jsonify({"error": "No data provided"}), 400

    try:
        metric_id = insert_session_metrics(session_id, data)
        return jsonify({"message": "Metrics persisted", "id": metric_id}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/patients/<patient_id>/metrics', methods=['GET'])
@token_required
def get_patient_metrics(current_user, patient_id):

    limit = request.args.get('limit', default=50, type=int)
    
    try:
        metrics = get_metrics_by_patient(patient_id, limit)
        return jsonify(metrics), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/sessions/<session_id>/metrics', methods=['GET'])
@token_required
def get_specific_session_metrics(current_user, session_id):

    session = get_session_by_id(session_id)
    if not session:
        return jsonify({"error": "Session not found"}), 404

    try:
        metrics = get_metrics_by_session(session_id)
        
        if not metrics:
            return jsonify({"message": "No metrics found for this session"}), 404
            
        return jsonify(metrics), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    debug = os.environ.get('FLASK_ENV') == 'development'
    app.run(host='0.0.0.0', port=port, debug=debug) 

