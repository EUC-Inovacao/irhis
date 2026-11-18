import sys
import unittest
from pathlib import Path
from unittest.mock import Mock, patch

import jwt as PyJWT

sys.path.insert(0, str(Path(__file__).resolve().parent))
import app as backend_app


DOCTOR = {
    "ID": "doctor-1",
    "Role": "Doctor",
    "Email": "irhis-d-000001@irhis.local",
    "FirstName": "Doctor",
    "LastName": "IRHIS-D-000001",
}


class DoctorPatientAccessTests(unittest.TestCase):
    """Doctors may only reach patients linked to them (patientdoctor)."""

    def setUp(self):
        backend_app.app.config["TESTING"] = True
        self.client = backend_app.app.test_client()
        token = PyJWT.encode(
            {"user_id": DOCTOR["ID"]},
            backend_app.app.config["SECRET_KEY"],
            algorithm="HS256",
        )
        self.headers = {"Authorization": f"Bearer {token}"}

    def _as_doctor(self, linked):
        """Patch the logged-in doctor and whether they are linked to the patient."""
        return [
            patch.object(backend_app, "get_user_by_id", return_value=DOCTOR),
            patch.object(backend_app, "is_db_enabled", return_value=True),
            patch.object(
                backend_app,
                "get_patient_doctor_relation",
                return_value={"ID": "rel-1"} if linked else None,
            ),
        ]

    def _run(self, linked, extra_patches, call):
        patches = self._as_doctor(linked) + extra_patches
        for p in patches:
            p.start()
        try:
            return call()
        finally:
            for p in reversed(patches):
                p.stop()

    # --- unlinked doctor is refused, and the data layer is never touched ---

    def test_unlinked_doctor_cannot_read_patient_profile(self):
        lookup = Mock()
        response = self._run(False, [patch.object(backend_app, "get_patient_by_id", lookup)],
                             lambda: self.client.get("/patients/patient-2", headers=self.headers))
        self.assertEqual(response.status_code, 403)
        lookup.assert_not_called()

    def test_unlinked_doctor_cannot_update_patient_details(self):
        update = Mock()
        response = self._run(False, [patch.object(backend_app, "db_update_patient_details", update)],
                             lambda: self.client.put("/patients/patient-2/details", headers=self.headers,
                                                     json={"details": {"weight": 80}}))
        self.assertEqual(response.status_code, 403)
        update.assert_not_called()

    def test_unlinked_doctor_cannot_update_patient_feedback(self):
        insert = Mock()
        response = self._run(False, [patch.object(backend_app, "insert_feedback", insert)],
                             lambda: self.client.put("/patients/patient-2/feedback", headers=self.headers,
                                                     json={"feedback": {"pain": 2}}))
        self.assertEqual(response.status_code, 403)
        insert.assert_not_called()

    def test_unlinked_doctor_cannot_list_sessions(self):
        sessions = Mock()
        response = self._run(False, [patch.object(backend_app, "get_patient_sessions", sessions)],
                             lambda: self.client.get("/patients/patient-2/sessions", headers=self.headers))
        self.assertEqual(response.status_code, 403)
        sessions.assert_not_called()

    def test_unlinked_doctor_cannot_read_patient_metrics(self):
        metrics = Mock()
        response = self._run(False, [patch.object(backend_app, "get_metrics_by_patient", metrics)],
                             lambda: self.client.get("/patients/patient-2/metrics", headers=self.headers))
        self.assertEqual(response.status_code, 403)
        metrics.assert_not_called()

    def test_unlinked_doctor_cannot_read_patient_exercises(self):
        sessions = Mock()
        response = self._run(False, [patch.object(backend_app, "get_patient_sessions", sessions)],
                             lambda: self.client.get("/patients/patient-2/exercises", headers=self.headers))
        self.assertEqual(response.status_code, 403)
        sessions.assert_not_called()

    def test_unlinked_doctor_cannot_read_session_metrics(self):
        metrics = Mock()
        response = self._run(False, [
            patch.object(backend_app, "get_session_by_id",
                         return_value={"ID": "session-2", "PatientID": "patient-2"}),
            patch.object(backend_app, "get_metrics_by_session", metrics),
        ], lambda: self.client.get("/sessions/session-2/metrics", headers=self.headers))
        self.assertEqual(response.status_code, 403)
        metrics.assert_not_called()

    def test_unlinked_doctor_cannot_delete_session(self):
        delete = Mock()
        response = self._run(False, [
            patch.object(backend_app, "get_session_by_id",
                         return_value={"ID": "session-2", "PatientID": "patient-2"}),
            patch.object(backend_app, "delete_patient_session", delete),
        ], lambda: self.client.delete("/sessions/session-2", headers=self.headers))
        self.assertEqual(response.status_code, 403)
        delete.assert_not_called()

    # --- linked doctor is allowed ---

    def test_linked_doctor_can_list_sessions(self):
        response = self._run(True, [
            patch.object(backend_app, "get_patient_sessions", return_value=[{"ID": "session-1"}]),
        ], lambda: self.client.get("/patients/patient-1/sessions", headers=self.headers))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()[0]["ID"], "session-1")

    def test_linked_doctor_can_delete_session(self):
        delete = Mock()
        response = self._run(True, [
            patch.object(backend_app, "get_session_by_id",
                         return_value={"ID": "session-1", "PatientID": "patient-1"}),
            patch.object(backend_app, "delete_patient_session", delete),
        ], lambda: self.client.delete("/sessions/session-1", headers=self.headers))
        self.assertEqual(response.status_code, 200)
        delete.assert_called_once_with("session-1")


class PublicSignupDisabledTests(unittest.TestCase):
    def test_signup_is_disabled_by_default(self):
        backend_app.app.config["TESTING"] = True
        client = backend_app.app.test_client()
        response = client.post("/signup", json={"password": "Secret123", "role": "Doctor"})
        self.assertEqual(response.status_code, 404)


if __name__ == "__main__":
    unittest.main()
