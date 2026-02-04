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

