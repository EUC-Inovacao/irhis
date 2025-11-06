# Local Authentication System - Complete Plan

## Overview
We're building a **fully local authentication system** using SQLite that stores users, patients, and doctor-patient assignments on-device. No cloud backend required.

## Architecture

### Database Schema
1. **users** table:
   - `id` (TEXT PRIMARY KEY)
   - `name` (TEXT)
   - `email` (TEXT UNIQUE)
   - `role` (TEXT: 'patient' | 'doctor')
   - `passwordHash` (TEXT) - SHA256 hash of salt+password
   - `salt` (TEXT) - random salt for each user
   - `createdAt` (TEXT ISO date)

2. **patients** table:
   - `id` (TEXT PRIMARY KEY) - matches user.id for patient users
   - `name` (TEXT)
   - `email` (TEXT)
   - `dateOfBirth` (TEXT, optional)
   - `doctorId` (TEXT, nullable) - assigned doctor's user.id
   - `createdAt` (TEXT ISO date)

3. **sessions** table (for exercise sessions):
   - `id` (TEXT PRIMARY KEY)
   - `patientId` (TEXT FOREIGN KEY)
   - `startTime`, `endTime` (TEXT ISO dates)
   - `exerciseType` (TEXT)
   - `side` (TEXT: 'left' | 'right')
   - `notes` (TEXT)

4. **metrics** table (for session results):
   - `id` (TEXT PRIMARY KEY)
   - `sessionId` (TEXT FOREIGN KEY)
   - `rom`, `maxFlexion`, `maxExtension` (REAL)
   - `reps` (INTEGER)
   - `score` (REAL)

### Authentication Flow

#### Signup Flow
1. User fills: Name, Email, Password, Role (Patient/Doctor)
2. System checks if email already exists
3. If exists: return existing user (auto-login)
4. If new:
   - Generate unique ID
   - Generate random salt
   - Hash password: `SHA256(salt + password)`
   - Store user in `users` table
   - If role=patient: also create entry in `patients` table with `doctorId=null`
5. Return local token and user object
6. Store in AsyncStorage and set in AuthContext

#### Login Flow
1. User enters: Email, Password, Role
2. Find user by email
3. If not found: throw "Invalid credentials"
4. Verify password: `SHA256(user.salt + inputPassword) === user.passwordHash`
5. If mismatch: throw "Invalid credentials"
6. Return local token and user object
7. Store in AsyncStorage and set in AuthContext

#### Doctor-Patient Assignment
1. Doctor views patient list (all patients in DB)
2. Doctor clicks patient → PatientDetailScreen
3. Doctor clicks "Assign to me" button
4. System updates `patients.doctorId = currentDoctor.id`
5. Patient now appears in doctor's assigned list

### Key Components

1. **Storage Layer** (`app/storage/`)
   - `db.ts` - Database initialization and migrations
   - `repositories.ts` - CRUD operations for users, patients, sessions, metrics

2. **Auth Service** (`app/services/localAuthService.ts`)
   - `signup()` - Create new user with password hashing
   - `login()` - Verify credentials and return user

3. **Context** (`app/context/AuthContext.tsx`)
   - Manages current user state
   - Provides `login()`, `signup()`, `logout()` methods
   - Persists to AsyncStorage

4. **UI Screens**
   - `LoginScreen.tsx` - Email + Password + Role selection
   - `SignupScreen.tsx` - Name + Email + Password + Role + Terms acceptance
   - `DoctorHomeScreen.tsx` - Lists all patients, shows assignment status
   - `PatientDetailScreen.tsx` - Shows "Assign to me" button for doctors

### Security Considerations
- Passwords are NEVER stored in plaintext
- Each user has unique salt (prevents rainbow table attacks)
- SHA256 hashing (adequate for local-only app)
- Email uniqueness enforced at DB level
- All data stays on-device (no network calls for auth)

### Future Enhancements (Not in Current Scope)
- Password reset flow
- Biometric authentication (Face ID/Touch ID)
- Session timeout
- Multi-doctor assignments
- Patient profile photos
- Email verification

## Current Status
✅ Database schema defined
✅ Migrations system working
✅ User signup/login implemented
✅ Password hashing with expo-crypto
✅ Doctor-patient assignment working
🔄 Testing and bug fixes in progress

