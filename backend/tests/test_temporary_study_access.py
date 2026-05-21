import sys
import unittest
from pathlib import Path
from unittest.mock import patch
import os

import jwt as PyJWT

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import app as backend_app


class TemporaryStudyAccessTests(unittest.TestCase):
    def setUp(self):
        backend_app.app.config["TESTING"] = True
        self.client = backend_app.app.test_client()

    def auth_headers(self, user_id="doctor-1"):
        token = PyJWT.encode(
            {"user_id": user_id},
            backend_app.app.config["SECRET_KEY"],
            algorithm="HS256",
        )
        return {"Authorization": f"Bearer {token}"}

    def temporary_patient_user(self, code="IRHIS-000001"):
        return {
            "ID": "patient-1",
            "Email": backend_app.build_temporary_access_email(code),
            "Password": backend_app.generate_password_hash("Secret123"),
            "Role": "Patient",
            "FirstName": "Patient",
            "LastName": code,
            "Active": 1,
            "Deleted": 0,
        }

    def doctor_user(self):
        return {
            "ID": "doctor-1",
            "Email": "doctor@example.com",
            "Role": "Doctor",
            "FirstName": "Dana",
            "LastName": "Doctor",
        }

    def test_resolve_login_identifier_uses_temporary_patient_email(self):
        self.assertEqual(
            backend_app.resolve_login_identifier("IRHIS-000321", "Patient"),
            "irhis-000321@irhis.local",
        )

    def test_resolve_login_identifier_accepts_legacy_patient_code(self):
        self.assertEqual(
            backend_app.resolve_login_identifier("IRHIS-P-000321", "Patient"),
            "irhis-000321@irhis.local",
        )

    def test_login_accepts_patient_code_and_hides_technical_email(self):
        with patch.object(backend_app, "is_db_enabled", return_value=True), patch.object(
            backend_app,
            "get_user_for_login",
            side_effect=lambda email, role: (
                self.temporary_patient_user()
                if email == "irhis-000001@irhis.local" and role == "Patient"
                else None
            ),
        ):
            response = self.client.post(
                "/login",
                json={"identifier": "IRHIS-000001", "password": "Secret123"},
            )

        self.assertEqual(response.status_code, 200)
        payload = response.get_json()
        self.assertEqual(payload["user"]["email"], "")
        self.assertEqual(payload["user"]["accessCode"], "IRHIS-000001")
        self.assertEqual(payload["user"]["patientCode"], "IRHIS-000001")
        self.assertEqual(payload["user"]["name"], "Patient IRHIS-000001")

    def test_login_accepts_patient_code_for_legacy_temporary_email(self):
        legacy_user = {
            **self.temporary_patient_user(),
            "Email": "irhis-p-000001@irhis.local",
        }
        with patch.object(backend_app, "is_db_enabled", return_value=True), patch.object(
            backend_app,
            "get_user_for_login",
            side_effect=lambda email, role: (
                legacy_user
                if email == "irhis-p-000001@irhis.local" and role == "Patient"
                else None
            ),
        ):
            response = self.client.post(
                "/login",
                json={"identifier": "IRHIS-000001", "password": "Secret123"},
            )

        self.assertEqual(response.status_code, 200)
        payload = response.get_json()
        self.assertEqual(payload["user"]["email"], "")
        self.assertEqual(payload["user"]["patientCode"], "IRHIS-000001")

    def test_me_hides_technical_email_for_temporary_patient(self):
        with patch.object(
            backend_app,
            "get_user_by_id",
            return_value=self.temporary_patient_user(),
        ):
            response = self.client.get(
                "/me",
                headers=self.auth_headers(user_id="patient-1"),
            )

        self.assertEqual(response.status_code, 200)
        payload = response.get_json()
        self.assertEqual(payload["email"], "")
        self.assertEqual(payload["patientCode"], "IRHIS-000001")
        self.assertEqual(payload["name"], "Patient IRHIS-000001")

    def test_signup_without_sensitive_fields_returns_generated_patient_code(self):
        temporary_user = {
            "user_id": "patient-9",
            "access_code": "IRHIS-000009",
            "patient_code": "IRHIS-000009",
            "label": "Patient IRHIS-000009",
            "email": "irhis-000009@irhis.local",
            "role": "Patient",
        }
        with patch.object(backend_app, "is_db_enabled", return_value=True), patch.object(
            backend_app,
            "create_temporary_user",
            return_value=temporary_user,
        ) as create_temporary_user, patch.object(
            backend_app,
            "create_patient_record",
        ) as create_patient_record:
            response = self.client.post(
                "/signup",
                json={
                    "password": "Secret123",
                    "role": "Patient",
                    "useTemporaryAccessCode": True,
                },
            )

        self.assertEqual(response.status_code, 201)
        payload = response.get_json()
        self.assertEqual(payload["user"]["email"], "")
        self.assertEqual(payload["user"]["patientCode"], "IRHIS-000009")
        self.assertEqual(payload["user"]["name"], "Patient IRHIS-000009")
        create_temporary_user.assert_called_once()
        create_patient_record.assert_called_once_with("patient-9", birth_date=None)

    def test_manual_patient_registration_returns_generated_patient_code(self):
        created_patient = {
            "user_id": "patient-2",
            "access_code": "IRHIS-000002",
            "patient_code": "IRHIS-000002",
            "label": "Patient IRHIS-000002",
            "email": "irhis-000002@irhis.local",
        }
        with patch.object(
            backend_app,
            "get_user_by_id",
            return_value=self.doctor_user(),
        ), patch.object(
            backend_app,
            "create_manual_patient",
            return_value=created_patient,
        ) as create_manual_patient:
            response = self.client.post(
                "/patients/manual-registry",
                headers=self.auth_headers(),
                json={
                    "password": "Secret123",
                    "sex": "male",
                    "weight": 80,
                    "height": 180,
                    "bmi": 24.7,
                    "affected_right_knee": 1,
                    "affected_left_knee": 0,
                    "affected_right_hip": 0,
                    "affected_left_hip": 1,
                    "leg_dominance": "dominant",
                },
            )

        self.assertEqual(response.status_code, 201)
        payload = response.get_json()
        self.assertEqual(payload["accessCode"], "IRHIS-000002")
        self.assertEqual(payload["patientCode"], "IRHIS-000002")
        self.assertEqual(payload["name"], "Patient IRHIS-000002")
        self.assertNotIn("email", payload)
        create_manual_patient.assert_called_once()

    def test_mock_dev_login_works_without_database(self):
        with patch.dict(os.environ, {"DEV_AUTH_MODE": "mock"}, clear=False):
            response = self.client.post(
                "/login",
                json={"identifier": "IRHIS-D-900001", "password": "DevPass123"},
            )

        self.assertEqual(response.status_code, 200)
        payload = response.get_json()
        self.assertEqual(payload["user"]["accessCode"], "IRHIS-D-900001")
        self.assertEqual(payload["user"]["role"], "Doctor")
        self.assertEqual(payload["user"]["email"], "")

    def test_mock_dev_me_works_without_database(self):
        with patch.dict(os.environ, {"DEV_AUTH_MODE": "mock"}, clear=False):
            login_response = self.client.post(
                "/login",
                json={"identifier": "IRHIS-900001", "password": "DevPass123"},
            )

            token = login_response.get_json()["token"]
            me_response = self.client.get(
                "/me",
                headers={"Authorization": f"Bearer {token}"},
            )

        self.assertEqual(me_response.status_code, 200)
        payload = me_response.get_json()
        self.assertEqual(payload["patientCode"], "IRHIS-900001")
        self.assertEqual(payload["role"], "Patient")
        self.assertEqual(payload["email"], "")


if __name__ == "__main__":
    unittest.main()
