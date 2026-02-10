-- Feedback table for session feedback (pain, fatigue, difficulty, comments).
CREATE TABLE IF NOT EXISTS feedback (
    ID VARCHAR(64) PRIMARY KEY,
    PatientID VARCHAR(36) NOT NULL,
    SessionID VARCHAR(36),
    FeedbackTime DATETIME NOT NULL,
    Pain INT NOT NULL DEFAULT 0,
    Fatigue INT NOT NULL DEFAULT 0,
    Difficulty INT NOT NULL DEFAULT 0,
    Comments TEXT,
    INDEX idx_feedback_patient (PatientID),
    INDEX idx_feedback_session (SessionID)
);
