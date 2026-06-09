-- Metrics table for session ROM/velocity data.
-- Run this on Azure MySQL if POST /sessions/<id>/metrics returns 500.
CREATE TABLE IF NOT EXISTS metrics (
    ID CHAR(36) PRIMARY KEY,
    SessionID CHAR(36) NOT NULL,
    Joint VARCHAR(32) NOT NULL DEFAULT 'knee',
    Side VARCHAR(32) NOT NULL DEFAULT 'both',
    Repetitions INT NOT NULL DEFAULT 0,
    MinVelocity DOUBLE DEFAULT 0,
    MaxVelocity DOUBLE DEFAULT 0,
    AvgVelocity DOUBLE DEFAULT 0,
    P95Velocity DOUBLE DEFAULT 0,
    MinROM DOUBLE DEFAULT 0,
    MaxROM DOUBLE DEFAULT 0,
    AvgROM DOUBLE DEFAULT 0,
    CenterMassDisplacement DOUBLE DEFAULT 0,
    TimeCreated DATETIME NOT NULL,
    INDEX idx_session (SessionID)
);
