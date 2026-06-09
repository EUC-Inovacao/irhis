#!/usr/bin/env python3
"""
Script to check users in the database and diagnose the unassigned patients issue.
Run this from the backend directory: python check_users.py
"""

import sys
from pathlib import Path

# Add parent directory to path to import db functions
sys.path.insert(0, str(Path(__file__).parent))

from db import fetch_all, fetch_one, is_db_enabled

def main():
    if not is_db_enabled():
        print("ERROR: Database not configured. Check your .env file.")
        return
    
    print("=" * 60)
    print("CHECKING USERS IN DATABASE")
    print("=" * 60)
    print()
    
    # 1. Check all users
    print("1. All users in database:")
    print("-" * 60)
    users = fetch_all("""
        SELECT 
            ID,
            Email,
            FirstName,
            LastName,
            Role,
            Active,
            COALESCE(Deleted, 0) AS Deleted
        FROM users
        ORDER BY Email
    """)
    
    for user in users:
        print(f"  Email: {user['Email']}")
        print(f"  Name: {user.get('FirstName', '')} {user.get('LastName', '')}")
        print(f"  Role: {user['Role']}")
        print(f"  Active: {user['Active']}")
        print(f"  Deleted: {user['Deleted']}")
        print(f"  ID: {user['ID']}")
        print()
    
    # 2. Check specifically for joaopbs98@gmail.com
    print("2. Your user account (joaopbs98@gmail.com):")
    print("-" * 60)
    your_user = fetch_one("""
        SELECT 
            ID,
            Email,
            FirstName,
            LastName,
            Role,
            Active,
            COALESCE(Deleted, 0) AS Deleted
        FROM users
        WHERE Email = :email
    """, {"email": "joaopbs98@gmail.com"})
    
    if your_user:
        print(f"  Email: {your_user['Email']}")
        print(f"  Name: {your_user.get('FirstName', '')} {your_user.get('LastName', '')}")
        print(f"  Role: {your_user['Role']} ⚠️")
        print(f"  Active: {your_user['Active']}")
        print(f"  Deleted: {your_user['Deleted']}")
        print(f"  ID: {your_user['ID']}")
        
        if your_user['Role'] != 'Doctor':
            print()
            print("  ⚠️  WARNING: Your role is not 'Doctor'!")
            print(f"     Current role: '{your_user['Role']}'")
            print("     This is why you might be seeing yourself in unassigned patients.")
    else:
        print("  User not found!")
    print()
    
    # 3. Check unassigned patients (what the API returns)
    print("3. Unassigned patients (what /patients/unassigned returns):")
    print("-" * 60)
    unassigned = fetch_all("""
        SELECT
          u.ID AS id,
          TRIM(CONCAT(COALESCE(u.FirstName,''), ' ', COALESCE(u.LastName,''))) AS name,
          u.Email AS email,
          u.Role
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
    """)
    
    if unassigned:
        for patient in unassigned:
            print(f"  Name: {patient.get('name', 'N/A')}")
            print(f"  Email: {patient.get('email', 'N/A')}")
            print(f"  Role: {patient.get('Role', 'N/A')}")
            print(f"  ID: {patient['id']}")
            print()
    else:
        print("  No unassigned patients found.")
    print()
    
    # 4. Check patientdoctor assignments
    print("4. Patient-Doctor assignments:")
    print("-" * 60)
    assignments = fetch_all("""
        SELECT 
            pd.DoctorID,
            u_doctor.Email AS DoctorEmail,
            pd.PatientID,
            u_patient.Email AS PatientEmail,
            pd.Active
        FROM patientdoctor pd
        JOIN users u_doctor ON u_doctor.ID = pd.DoctorID
        JOIN users u_patient ON u_patient.ID = pd.PatientID
        ORDER BY u_doctor.Email, u_patient.Email
    """)
    
    if assignments:
        for assignment in assignments:
            print(f"  Doctor: {assignment['DoctorEmail']}")
            print(f"  Patient: {assignment['PatientEmail']}")
            print(f"  Active: {assignment['Active']}")
            print()
    else:
        print("  No assignments found.")
    print()
    
    print("=" * 60)
    print("DIAGNOSIS COMPLETE")
    print("=" * 60)

if __name__ == "__main__":
    main()
