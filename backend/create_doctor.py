#!/usr/bin/env python3
"""
Create a doctor (clinician) account.

Public sign-up was removed from the app and the API, so doctor accounts are
created by an administrator with this script. It generates the next
IRHIS-D-XXXXXX access code and prints it.

Usage (from the backend directory, with DATABASE_URL set in .env):
    python create_doctor.py

Patients are not created here: a doctor creates them in the app
(Patients -> Add Patient), which also links them to that doctor.
"""

import getpass
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from werkzeug.security import generate_password_hash  # noqa: E402

from db import create_temporary_user, is_db_enabled  # noqa: E402
from app import validate_signup_password  # noqa: E402


def main() -> int:
    if not is_db_enabled():
        print("DATABASE_URL is not configured (see env.example).", file=sys.stderr)
        return 1

    password = getpass.getpass("Password for the new doctor: ")
    error = validate_signup_password(password)
    if error:
        print(error, file=sys.stderr)
        return 1
    if getpass.getpass("Repeat password: ") != password:
        print("Passwords do not match.", file=sys.stderr)
        return 1

    doctor = create_temporary_user("Doctor", generate_password_hash(password))
    print(f"Doctor created. Access code: {doctor['access_code']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
