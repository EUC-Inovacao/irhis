import { getDatabase, executeSql } from "./db";

export interface PatientRecord {
  id: string;
  name: string;
  email?: string;
  birthDate: string; // Required - DATE NOT NULL
  sex: 'male' | 'female'; // Required - ENUM NOT NULL
  weight?: number; // DECIMAL(10,2)
  height?: number; // DECIMAL(10,2)
  bmi?: number; // DECIMAL(10,2)
  occupation?: 'white' | 'blue'; // ENUM
  education?: number; // INT
  affectedRightKnee: boolean; // Required - BOOLEAN NOT NULL DEFAULT FALSE
  affectedLeftKnee: boolean; // Required - BOOLEAN NOT NULL DEFAULT FALSE
  affectedRightHip: boolean; // Required - BOOLEAN NOT NULL DEFAULT FALSE
  affectedLeftHip: boolean; // Required - BOOLEAN NOT NULL DEFAULT FALSE
  medicalHistory?: string; // TEXT
  timeAfterSymptoms?: number; // INT
  legDominance: 'dominant' | 'non-dominant'; // Required - ENUM NOT NULL
  contralateralJointAffect: boolean; // Required - BOOLEAN NOT NULL DEFAULT FALSE
  physicallyActive: boolean; // Required - BOOLEAN NOT NULL DEFAULT FALSE
  coMorbiditiesNMS: boolean; // Required - BOOLEAN NOT NULL DEFAULT FALSE
  coMorbiditiesSystemic: boolean; // Required - BOOLEAN NOT NULL DEFAULT FALSE
  createdAt: string;
  doctorId?: string | null;
}

export interface SessionRecord {
  id: string;
  patientId: string;
  startTime: string;
  endTime?: string;
  exerciseType: string;
  side?: "left" | "right";
  notes?: string;
  exerciseTypeId?: string;
}

export interface MetricsRecord {
  id: string;
  sessionId: string;
  rom?: number;
  maxFlexion?: number;
  maxExtension?: number;
  reps?: number;
  score?: number;
}

export interface ExerciseTypeRecord {
  id: string;
  name: string;
  description?: string;
  targetReps?: number;
  targetSets?: number;
  instructions?: string;
  category: "knee" | "hip" | "ankle" | "general";
}

export interface AssignedExerciseRecord {
  id: string;
  patientId: string;
  exerciseTypeId: string;
  assignedDate: string;
  completed: number; // 0 or 1 (SQLite boolean)
  targetReps?: number;
  targetSets?: number;
}

export interface FeedbackRecord {
  id: string;
  patientId: string;
  sessionId?: string;
  timestamp: string;
  pain: number;
  fatigue: number;
  difficulty: number;
  comments?: string;
}

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  role: "patient" | "doctor";
  createdAt: string;
  passwordHash?: string | null;
  salt?: string | null;
}

export const UsersRepository = {
  async create(user: UserRecord): Promise<void> {
    await executeSql(
      `INSERT INTO users (id, name, email, role, createdAt, passwordHash, salt) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        user.id,
        user.name,
        user.email,
        user.role,
        user.createdAt,
        user.passwordHash ?? null,
        user.salt ?? null,
      ]
    );
  },
  async findByEmail(email: string): Promise<UserRecord | null> {
    const result = await executeSql(
      `SELECT * FROM users WHERE email = ? LIMIT 1`,
      [email]
    );
    return (result.rows._array?.[0] as UserRecord) ?? null;
  },
  async findById(id: string): Promise<UserRecord | null> {
    const result = await executeSql(
      `SELECT * FROM users WHERE id = ? LIMIT 1`,
      [id]
    );
    return (result.rows._array?.[0] as UserRecord) ?? null;
  },
  async listByRole(role: "patient" | "doctor"): Promise<UserRecord[]> {
    const result = await executeSql(
      `SELECT * FROM users WHERE role = ? ORDER BY createdAt DESC`,
      [role]
    );
    return result.rows._array as UserRecord[];
  },
};

export const PatientsRepository = {
  async create(patient: PatientRecord): Promise<void> {
    await executeSql(
      `INSERT INTO patients (
        id, name, email, birthDate, sex, weight, height, bmi, occupation, education,
        affectedRightKnee, affectedLeftKnee, affectedRightHip, affectedLeftHip,
        medicalHistory, timeAfterSymptoms, legDominance, contralateralJointAffect,
        physicallyActive, coMorbiditiesNMS, coMorbiditiesSystemic, createdAt, doctorId
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        patient.id,
        patient.name,
        patient.email ?? null,
        patient.birthDate,
        patient.sex,
        patient.weight ?? null,
        patient.height ?? null,
        patient.bmi ?? null,
        patient.occupation ?? null,
        patient.education ?? null,
        patient.affectedRightKnee ? 1 : 0,
        patient.affectedLeftKnee ? 1 : 0,
        patient.affectedRightHip ? 1 : 0,
        patient.affectedLeftHip ? 1 : 0,
        patient.medicalHistory ?? null,
        patient.timeAfterSymptoms ?? null,
        patient.legDominance,
        patient.contralateralJointAffect ? 1 : 0,
        patient.physicallyActive ? 1 : 0,
        patient.coMorbiditiesNMS ? 1 : 0,
        patient.coMorbiditiesSystemic ? 1 : 0,
        patient.createdAt,
        patient.doctorId ?? null,
      ]
    );
  },
  async getById(id: string): Promise<PatientRecord | null> {
    const result = await executeSql(
      `SELECT * FROM patients WHERE id = ? LIMIT 1`,
      [id]
    );
    return (result.rows._array?.[0] as PatientRecord) ?? null;
  },
  async upsert(patient: PatientRecord): Promise<void> {
    const exists = await this.getById(patient.id);
    if (exists) return; // minimal upsert; we only insert on first run
    await this.create(patient);
  },
  async list(): Promise<PatientRecord[]> {
    const result = await executeSql(
      `SELECT * FROM patients ORDER BY createdAt DESC`,
      []
    );
    return result.rows._array as PatientRecord[];
  },
  async listUnassigned(): Promise<PatientRecord[]> {
    const result = await executeSql(
      `SELECT * FROM patients WHERE doctorId IS NULL ORDER BY createdAt DESC`,
      []
    );
    return result.rows._array as PatientRecord[];
  },
  async assignToDoctor(patientId: string, doctorId: string): Promise<void> {
    await executeSql(`UPDATE patients SET doctorId = ? WHERE id = ?`, [
      doctorId,
      patientId,
    ]);
  },
};

export const SessionsRepository = {
  async create(session: SessionRecord): Promise<void> {
    await executeSql(
      `INSERT INTO sessions (id, patientId, startTime, endTime, exerciseType, side, notes, exerciseTypeId) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        session.id,
        session.patientId,
        session.startTime,
        session.endTime ?? null,
        session.exerciseType,
        session.side ?? null,
        session.notes ?? null,
        session.exerciseTypeId ?? null,
      ]
    );
  },
  async listByPatient(patientId: string): Promise<SessionRecord[]> {
    const result = await executeSql(
      `SELECT * FROM sessions WHERE patientId = ? ORDER BY startTime DESC`,
      [patientId]
    );
    return result.rows._array as SessionRecord[];
  },
};

export const MetricsRepository = {
  async create(metrics: MetricsRecord): Promise<void> {
    await executeSql(
      `INSERT INTO metrics (id, sessionId, rom, maxFlexion, maxExtension, reps, score) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        metrics.id,
        metrics.sessionId,
        metrics.rom ?? null,
        metrics.maxFlexion ?? null,
        metrics.maxExtension ?? null,
        metrics.reps ?? null,
        metrics.score ?? null,
      ]
    );
  },
  async getBySession(sessionId: string): Promise<MetricsRecord | null> {
    const result = await executeSql(
      `SELECT * FROM metrics WHERE sessionId = ? LIMIT 1`,
      [sessionId]
    );
    return (result.rows._array?.[0] as MetricsRecord) ?? null;
  },
};

export const ExerciseTypesRepository = {
  async create(exercise: ExerciseTypeRecord): Promise<void> {
    await executeSql(
      `INSERT INTO exerciseTypes (id, name, description, targetReps, targetSets, instructions, category) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        exercise.id,
        exercise.name,
        exercise.description ?? null,
        exercise.targetReps ?? null,
        exercise.targetSets ?? null,
        exercise.instructions ?? null,
        exercise.category,
      ]
    );
  },
  async list(): Promise<ExerciseTypeRecord[]> {
    const result = await executeSql(
      `SELECT * FROM exerciseTypes ORDER BY name`,
      []
    );
    return result.rows._array as ExerciseTypeRecord[];
  },
  async getById(id: string): Promise<ExerciseTypeRecord | null> {
    const result = await executeSql(
      `SELECT * FROM exerciseTypes WHERE id = ? LIMIT 1`,
      [id]
    );
    return (result.rows._array?.[0] as ExerciseTypeRecord) ?? null;
  },
  async listByCategory(category: string): Promise<ExerciseTypeRecord[]> {
    const result = await executeSql(
      `SELECT * FROM exerciseTypes WHERE category = ? ORDER BY name`,
      [category]
    );
    return result.rows._array as ExerciseTypeRecord[];
  },
};

export const AssignedExercisesRepository = {
  async create(assignment: AssignedExerciseRecord): Promise<void> {
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/3a24ed6e-2364-40cb-80fb-67e27d6c712f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'repositories.ts:287',message:'AssignedExercisesRepository.create called',data:{assignmentId:assignment.id, patientId:assignment.patientId, exerciseTypeId:assignment.exerciseTypeId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    await executeSql(
      `INSERT INTO assignedExercises (id, patientId, exerciseTypeId, assignedDate, completed, targetReps, targetSets) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        assignment.id,
        assignment.patientId,
        assignment.exerciseTypeId,
        assignment.assignedDate,
        assignment.completed,
        assignment.targetReps ?? null,
        assignment.targetSets ?? null,
      ]
    );
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/3a24ed6e-2364-40cb-80fb-67e27d6c712f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'repositories.ts:299',message:'INSERT executed successfully',data:{assignmentId:assignment.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
  },
  async listByPatient(patientId: string): Promise<AssignedExerciseRecord[]> {
    const result = await executeSql(
      `SELECT * FROM assignedExercises WHERE patientId = ? ORDER BY assignedDate DESC`,
      [patientId]
    );
    return result.rows._array as AssignedExerciseRecord[];
  },
  async getById(id: string): Promise<AssignedExerciseRecord | null> {
    const result = await executeSql(
      `SELECT * FROM assignedExercises WHERE id = ? LIMIT 1`,
      [id]
    );
    return (result.rows._array?.[0] as AssignedExerciseRecord) ?? null;
  },
  async update(id: string, updates: Partial<AssignedExerciseRecord>): Promise<void> {
    const fields: string[] = [];
    const values: any[] = [];
    
    if (updates.completed !== undefined) {
      fields.push("completed = ?");
      values.push(updates.completed);
    }
    if (updates.targetReps !== undefined) {
      fields.push("targetReps = ?");
      values.push(updates.targetReps);
    }
    if (updates.targetSets !== undefined) {
      fields.push("targetSets = ?");
      values.push(updates.targetSets);
    }
    
    if (fields.length === 0) return;
    
    values.push(id);
    await executeSql(
      `UPDATE assignedExercises SET ${fields.join(", ")} WHERE id = ?`,
      values
    );
  },
  async markCompleted(id: string): Promise<void> {
    await this.update(id, { completed: 1 });
  },
};

export const FeedbackRepository = {
  async create(feedback: FeedbackRecord): Promise<void> {
    await executeSql(
      `INSERT INTO feedback (id, patientId, sessionId, timestamp, pain, fatigue, difficulty, comments) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        feedback.id,
        feedback.patientId,
        feedback.sessionId ?? null,
        feedback.timestamp,
        feedback.pain,
        feedback.fatigue,
        feedback.difficulty,
        feedback.comments ?? null,
      ]
    );
  },
  async listByPatient(patientId: string): Promise<FeedbackRecord[]> {
    const result = await executeSql(
      `SELECT * FROM feedback WHERE patientId = ? ORDER BY timestamp DESC`,
      [patientId]
    );
    return result.rows._array as FeedbackRecord[];
  },
  async getById(id: string): Promise<FeedbackRecord | null> {
    const result = await executeSql(
      `SELECT * FROM feedback WHERE id = ? LIMIT 1`,
      [id]
    );
    return (result.rows._array?.[0] as FeedbackRecord) ?? null;
  },
};
