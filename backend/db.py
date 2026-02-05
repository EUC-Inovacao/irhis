import os
import ssl
import uuid
from typing import Any, Optional
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
from datetime import datetime, timezone
from typing import Any
from urllib.parse import urlparse, parse_qsl, urlencode, urlunparse

load_dotenv()

_raw_database_url = (os.getenv("DATABASE_URL") or "").strip()

def _sanitize_database_url(url: str) -> str:
    if not url:
        return url
    parsed = urlparse(url)
    query_items = [
        (k, v)
        for (k, v) in parse_qsl(parsed.query, keep_blank_values=True)
        if k.lower() not in {"ssl", "ssl_ca", "sslcert", "sslkey", "sslcapath"}
    ]
    return urlunparse(parsed._replace(query=urlencode(query_items)))

DATABASE_URL = _sanitize_database_url(_raw_database_url)

def _build_ssl_context() -> ssl.SSLContext:
    ca_path = (os.getenv("MYSQL_SSL_CA") or "").strip()
    if ca_path:
        return ssl.create_default_context(cafile=ca_path)
    return ssl.create_default_context()

_engine: Optional[Engine] = (
    create_engine(
        DATABASE_URL,
        pool_pre_ping=True,
        connect_args={"ssl": _build_ssl_context()},  
    )
    if DATABASE_URL
    else None
)


def is_db_enabled() -> bool:
    return _engine is not None


def fetch_all(sql: str, params: Optional[dict[str, Any]] = None) -> list[dict[str, Any]]:
    if _engine is None:
        raise RuntimeError("DATABASE_URL not configured")
    with _engine.connect() as connection:
        result = connection.execute(text(sql), params or {})
        return [dict(row._mapping) for row in result]


def fetch_one(sql: str, params: Optional[dict[str, Any]] = None) -> Optional[dict[str, Any]]:
    rows = fetch_all(sql, params)
    return rows[0] if rows else None


def execute(sql: str, params: Optional[dict[str, Any]] = None) -> None:
    if _engine is None:
        raise RuntimeError("DATABASE_URL not configured")
    with _engine.begin() as connection:
        connection.execute(text(sql), params or {})

def create_manual_patient(user_data, patient_data, doctor_id):
    user_id = str(uuid.uuid4())
    temp_email = f"paciente_{user_id[:8]}@irhis_sistema.com"
    
    execute(
        """
        INSERT INTO users (ID, Email, Password, FirstName, LastName, Role, Active, Deleted)
        VALUES (:id, :email, :password, :fname, :lname, 'Patient', 1, 0)
        """,
        {
            "id": user_id,
            "email": temp_email,
            "password": "Mudar123!", 
            "fname": user_data.get('first_name'),
            "lname": user_data.get('last_name', '')
        }
    )

    execute(
        """
        INSERT INTO patient (
            UserID, BirthDate, Sex, Weight, Height, BMI, Occupation, Education,
            AffectedRightKnee, AffectedLeftKnee, AffectedRightHip, AffectedLeftHip,
            MedicalHistory, TimeAfterSymptoms, LegDominance, PhysicallyActive
        )
        VALUES (
            :user_id, :birth_date, :sex, :weight, :height, :bmi, :occupation, :education,
            :ark, :alk, :arh, :alh, :med_hist, :tas, :leg_dom, :active
        )
        """,
        {
            "user_id": user_id,
            "birth_date": patient_data.get('birth_date'),
            "sex": patient_data.get('sex'),
            "weight": patient_data.get('weight'),
            "height": patient_data.get('height'),
            "bmi": patient_data.get('bmi'),
            "occupation": patient_data.get('occupation'),
            "education": patient_data.get('education'),
            "ark": patient_data.get('affected_right_knee'),
            "alk": patient_data.get('affected_left_knee'),
            "arh": patient_data.get('affected_right_hip'),
            "alh": patient_data.get('affected_left_hip'),
            "med_hist": patient_data.get('medical_history'),
            "tas": patient_data.get('time_after_symptoms'),
            "leg_dom": patient_data.get('leg_dominance'),
            "active": patient_data.get('physically_active', 0)
        }
    )

    assign_patient_to_doctor(patient_id=user_id, doctor_id=doctor_id)

    return user_id, temp_email

def get_doctor_patient_ids(doctor_id: str) -> list[str]:
    rows = fetch_all(
        """
        SELECT PatientID
        FROM patientdoctor
        WHERE DoctorID = :doctor_id AND Active = 1
        """,
        {"doctor_id": doctor_id},
    )
    return [row["PatientID"] for row in rows]

def list_doctor_patients(doctor_id: str) -> list[dict[str, Any]]:
    rows = fetch_all(
        """
        SELECT
          u.ID AS id,
          TRIM(CONCAT(COALESCE(u.FirstName,''), ' ', COALESCE(u.LastName,''))) AS name,
          u.Email AS email
        FROM patientdoctor pd
        JOIN users u ON u.ID = pd.PatientID
        WHERE pd.DoctorID = :doctor_id
          AND pd.Active = 1
        ORDER BY u.FirstName, u.LastName
        """,
        {"doctor_id": doctor_id},
    )

    return [
        {
            "id": row["id"],
            "name": row.get("name") or "",
            "email": row.get("email") or "",
        }
        for row in rows
    ]

def list_unassigned_patients() -> list[dict[str, Any]]:
    rows = fetch_all(
        """
        SELECT
          u.ID AS id,
          TRIM(CONCAT(COALESCE(u.FirstName,''), ' ', COALESCE(u.LastName,''))) AS name,
          u.Email AS email
        FROM users u
        WHERE u.Role = 'Patient'
          AND COALESCE(u.Deleted, 0) = 0
          AND NOT EXISTS (
            SELECT 1
            FROM patientdoctor pd
            WHERE pd.PatientID = u.ID
              AND pd.Active = 1
          )
        ORDER BY u.FirstName, u.LastName
        """
    )

    return [
        {
            "id": row["id"],
            "name": row.get("name") or "",
            "email": row.get("email") or "",
        }
        for row in rows
    ]

def get_patient_doctor_relation(patient_id: str, doctor_id: str):
    return fetch_one(
        """
        SELECT ID 
        FROM patientdoctor 
        WHERE PatientID = :patient_id 
          AND DoctorID = :doctor_id 
          AND Active = 1
        LIMIT 1
        """,
        {"patient_id": patient_id, "doctor_id": doctor_id}
    )

def assign_patient_to_doctor(patient_id: str, doctor_id: str) -> None:
    now = datetime.now(timezone.utc)
    new_entry_id = str(uuid.uuid4())

    execute(
        """
        UPDATE patientdoctor
        SET Active = 0, TimeActive = :now
        WHERE PatientID = :patient_id AND Active = 1
        """,
        {"patient_id": patient_id, "now": now},
    )

    execute(
        """
        INSERT INTO patientdoctor (ID, PatientID, DoctorID, Active, TimeCreated, TimeActive)
        VALUES (:id, :patient_id, :doctor_id, 1, :now, :now)
        """,
        {
            "id": new_entry_id, 
            "patient_id": patient_id, 
            "doctor_id": doctor_id, 
            "now": now
        },
    )

def get_user_for_login(email: str, role: str) -> Optional[dict[str, Any]]:
    return fetch_one(
        """
        SELECT
          ID,
          Email,
          Password,
          Role,
          FirstName,
          LastName,
          Active,
          Deleted
        FROM users
        WHERE Email = :email
          AND Role = :role
          AND Active = 1
          AND COALESCE(Deleted, 0) = 0
        LIMIT 1
        """,
        {"email": email, "role": role},
    )


def get_user_by_id(user_id: str) -> Optional[dict[str, Any]]:
    return fetch_one(
        """
        SELECT
          ID,
          Email,
          Role,
          FirstName,
          LastName
        FROM users
        WHERE ID = :id
          AND Active = 1
          AND COALESCE(Deleted, 0) = 0
        """,
        {"id": user_id},
    )

def get_patient_sessions(patient_id: str):
    rows = fetch_all(
        """
        SELECT S.*, pd.PatientID
        FROM session s
        INNER JOIN patientdoctor pd ON pd.ID = s.RelationID
        WHERE pd.PatientID = :patientID 
          AND s.Active = 1;
        """,
        {"patientID": patient_id}
    )
    
    for row in rows:
        if row.get('Duration'):
            row['Duration'] = str(row['Duration'])
            
    return rows

def get_session_by_id(session_id: str):
    session = fetch_one(
        """
        SELECT s.*, pd.PatientID 
        FROM session s
        JOIN patientdoctor pd ON s.RelationID = pd.ID
        WHERE s.ID = :session_id and s.Active = 1
        """,
        {"session_id": session_id}
    )

    if session:
        if session.get('Duration'):
            session['Duration'] = str(session['Duration'])
            
    return session

def assign_session_to_patient(relation_id: str, exercise_type, exercise_description, repetitions, duration):
    now = datetime.now(timezone.utc)
    new_entry_id = str(uuid.uuid4())

    execute(
        """
        INSERT INTO session (ID, RelationID, ExerciseType, ExerciseDescription, Repetitions, Duration, TimeCreated, Active)
        VALUES (:id, :relation_id, :exercise_type, :exercise_description, :repetitions, :duration, :now, 1)
        """,
        {
            "id": new_entry_id, 
            "relation_id": relation_id, 
            "exercise_type": exercise_type,
            "exercise_description": exercise_description,
            "repetitions": repetitions,
            "duration": duration, 
            "now": now
        },
    )

def update_session_details(session_id, exercise_type, exercise_description, repetitions, duration):
    execute(
        """
        UPDATE session
        SET ExerciseType = :exercise_type, 
            ExerciseDescription = :exercise_description, 
            Repetitions = :repetitions, 
            Duration = :duration
        WHERE ID = :session_id AND Active = 1
        """,
        {
            "session_id": session_id,
            "exercise_type": exercise_type,
            "exercise_description": exercise_description,
            "repetitions": repetitions,
            "duration": duration
        }
    )

def delete_patient_session(session_id):
    execute(
        """
        UPDATE session 
        SET Active = 0, 
            TimeDeleted = :now 
        WHERE ID = :session_id
        """,
        {
            "session_id": session_id,
            "now": datetime.now(timezone.utc)
        }
    )

def insert_session_metrics(session_id, data):
    new_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    
    execute(
        """
        INSERT INTO metrics (
            ID, SessionID, Joint, Side, Repetitions, -- Ajustado de Repetition para Repetitions
            MinVelocity, MaxVelocity, AvgVelocity, P95Velocity, 
            MinROM, MaxROM, AvgROM, CenterMassDisplacement, TimeCreated
        )
        VALUES (
            :id, :session_id, :joint, :side, :repetition, 
            :min_v, :max_v, :avg_v, :p95_v, 
            :min_rom, :max_rom, :avg_rom, :cmd, :now
        )
        """,
        {
            "id": new_id, 
            "session_id": session_id,
            "joint": data.get('joint'), 
            "side": data.get('side'),
            "repetition": data.get('repetition'), 
            "min_v": data.get('min_velocity'), 
            "max_v": data.get('max_velocity'),
            "avg_v": data.get('avg_velocity'), 
            "p95_v": data.get('p95_velocity'),
            "min_rom": data.get('min_rom'), 
            "max_rom": data.get('max_rom'),
            "avg_rom": data.get('avg_rom'), 
            "cmd": data.get('center_mass_displacement'),
            "now": now
        }
    )
    return new_id

def get_metrics_by_patient(patient_id, limit=10):
    rows = fetch_all(
        """
        SELECT m.*, s.ExerciseType
        FROM metrics m
        JOIN session s ON m.SessionID = s.ID
        JOIN patientdoctor pd ON s.RelationID = pd.ID
        WHERE pd.PatientID = :patient_id
        ORDER BY s.TimeCreated DESC, m.Repetitions ASC -- Ajustado para o plural aqui também
        LIMIT :limit
        """,
        {"patient_id": patient_id, "limit": limit}
    )
    
    for row in rows:
        if row.get('TimeCreated'): row['TimeCreated'] = str(row['TimeCreated'])
        if row.get('SessionDate'): row['SessionDate'] = str(row['SessionDate'])
            
    return rows

def get_metrics_by_session(session_id: str):
    rows = fetch_all(
        """
        SELECT * FROM metrics 
        WHERE SessionID = :session_id
        ORDER BY Repetitions ASC -- Ajustado para o plural
        """,
        {"session_id": session_id}
    )
    
    for row in rows:
        if row.get('TimeCreated'):
            row['TimeCreated'] = str(row['TimeCreated'])
            
    return rows