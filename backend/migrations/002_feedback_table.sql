-- Patient feedback per session (pain, fatigue, difficulty, comments).
-- Matches the table the code uses: db.py insert_feedback(), get_feedback_by_patient(),
-- delete_patient_session(). The table already exists on Azure; this script recreates
-- it for new environments. Confirm against production with: SHOW CREATE TABLE PatientFeedback;
CREATE TABLE IF NOT EXISTS PatientFeedback (
    ID VARCHAR(64) PRIMARY KEY,
    UserID VARCHAR(36) NOT NULL,          -- patient (users.ID)
    SessionID VARCHAR(36) NULL,           -- session (session.ID), optional
    Pain INT NOT NULL DEFAULT 0,
    Fatigue INT NOT NULL DEFAULT 0,
    Difficulty INT NOT NULL DEFAULT 0,
    Comments TEXT NULL,
    TimeCreated DATETIME NOT NULL,
    INDEX idx_patientfeedback_user (UserID),
    INDEX idx_patientfeedback_session (SessionID)
);
