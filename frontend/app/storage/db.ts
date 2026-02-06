import * as SQLite from "expo-sqlite";

type DB = any;
let database: DB | null = null;
let dbType: "transaction" | "execAsync" | null = null;

export function getDatabase(): DB {
  if (database) return database;

  // Expo SDK 53+ recommends openDatabaseSync; fall back if not present
  const anySQLite = SQLite as any;
  if (typeof anySQLite.openDatabaseSync === "function") {
    database = anySQLite.openDatabaseSync("irhis.db");
    dbType = "execAsync";
  } else if (typeof anySQLite.openDatabase === "function") {
    database = anySQLite.openDatabase("irhis.db");
    dbType = "transaction";
  } else {
    throw new Error(
      "expo-sqlite not initialized. Ensure the native module is installed."
    );
  }

  return database;
}

export function getDbType(): "transaction" | "execAsync" {
  if (!dbType) {
    getDatabase(); // Initialize if needed
  }
  return dbType || "execAsync";
}

// Helper to execute SQL with both APIs
export async function executeSql(
  sql: string,
  params: any[] = []
): Promise<any> {
  const db = getDatabase();
  const type = getDbType();

  if (type === "transaction") {
    return new Promise((resolve, reject) => {
      db.transaction(
        (tx: any) => {
          tx.executeSql(
            sql,
            params,
            (_: any, result: any) => resolve(result),
            (_: any, error: any) => {
              reject(error);
              return true;
            }
          );
        },
        (error: any) => reject(error),
        () => {}
      );
    });
  } else {
    // New expo-sqlite API (openDatabaseSync)
    // Use runAsync for INSERT/UPDATE/DELETE, getAllAsync for SELECT
    const isSelect = sql.trim().toUpperCase().startsWith("SELECT");
    
    if (isSelect) {
      const result = await db.getAllAsync(sql, params);
      return { rows: { _array: result } };
    } else {
      await db.runAsync(sql, params);
      return { insertId: null, rowsAffected: 1 };
    }
  }
}

export async function runMigrations(): Promise<void> {
  const db: any = getDatabase();
  const type = getDbType();

  const statements = [
    `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      role TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      passwordHash TEXT,
      salt TEXT
    );`,
    `CREATE TABLE IF NOT EXISTS patients (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      email TEXT,
      birthDate TEXT NOT NULL,
      sex TEXT NOT NULL,
      weight REAL,
      height REAL,
      bmi REAL,
      occupation TEXT,
      education INTEGER,
      affectedRightKnee INTEGER NOT NULL DEFAULT 0,
      affectedLeftKnee INTEGER NOT NULL DEFAULT 0,
      affectedRightHip INTEGER NOT NULL DEFAULT 0,
      affectedLeftHip INTEGER NOT NULL DEFAULT 0,
      medicalHistory TEXT,
      timeAfterSymptoms INTEGER,
      legDominance TEXT NOT NULL,
      contralateralJointAffect INTEGER NOT NULL DEFAULT 0,
      physicallyActive INTEGER NOT NULL DEFAULT 0,
      coMorbiditiesNMS INTEGER NOT NULL DEFAULT 0,
      coMorbiditiesSystemic INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL,
      doctorId TEXT
    );`,
    `CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY NOT NULL,
      patientId TEXT NOT NULL,
      startTime TEXT NOT NULL,
      endTime TEXT,
      exerciseType TEXT NOT NULL,
      side TEXT,
      notes TEXT,
      FOREIGN KEY(patientId) REFERENCES patients(id)
    );`,
    `CREATE TABLE IF NOT EXISTS metrics (
      id TEXT PRIMARY KEY NOT NULL,
      sessionId TEXT NOT NULL,
      rom REAL,
      maxFlexion REAL,
      maxExtension REAL,
      reps INTEGER,
      score REAL,
      FOREIGN KEY(sessionId) REFERENCES sessions(id)
    );`,
    `CREATE TABLE IF NOT EXISTS exerciseTypes (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      targetReps INTEGER,
      targetSets INTEGER,
      instructions TEXT,
      category TEXT NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS assignedExercises (
      id TEXT PRIMARY KEY NOT NULL,
      patientId TEXT NOT NULL,
      exerciseTypeId TEXT NOT NULL,
      assignedDate TEXT NOT NULL,
      completed INTEGER DEFAULT 0,
      targetReps INTEGER,
      targetSets INTEGER,
      FOREIGN KEY(patientId) REFERENCES patients(id),
      FOREIGN KEY(exerciseTypeId) REFERENCES exerciseTypes(id)
    );`,
    `CREATE TABLE IF NOT EXISTS feedback (
      id TEXT PRIMARY KEY NOT NULL,
      patientId TEXT NOT NULL,
      sessionId TEXT,
      timestamp TEXT NOT NULL,
      pain INTEGER NOT NULL,
      fatigue INTEGER NOT NULL,
      difficulty INTEGER NOT NULL,
      comments TEXT,
      FOREIGN KEY(patientId) REFERENCES patients(id)
    );`,
  ];

  if (type === "transaction") {
    await new Promise<void>((resolve, reject) => {
      db.transaction(
        (tx: any) => {
          statements.forEach((sql) => {
            tx.executeSql(sql);
          });
          // Add columns if they don't exist (for existing databases)
          tx.executeSql(
            `SELECT passwordHash FROM users LIMIT 1`,
            [],
            () => {},
            () => {
              // Column doesn't exist, add it
              tx.executeSql(`ALTER TABLE users ADD COLUMN passwordHash TEXT`);
              tx.executeSql(`ALTER TABLE users ADD COLUMN salt TEXT`);
            }
          );
          tx.executeSql(
            `SELECT doctorId FROM patients LIMIT 1`,
            [],
            () => {},
            () => {
              tx.executeSql(`ALTER TABLE patients ADD COLUMN doctorId TEXT`);
            }
          );
          tx.executeSql(
            `SELECT exerciseTypeId FROM sessions LIMIT 1`,
            [],
            () => {},
            () => {
              tx.executeSql(`ALTER TABLE sessions ADD COLUMN exerciseTypeId TEXT`);
            }
          );
        },
        (error: any) => reject(error),
        () => resolve()
      );
    });
  } else {
    // New API - run each statement sequentially
    for (const sql of statements) {
      try {
        await db.execAsync(sql);
      } catch (error: any) {
        // Ignore "table already exists" errors
        if (!error?.message?.includes("already exists")) {
          throw error;
        }
      }
    }
    
    // Add columns if they don't exist (for existing databases)
    try {
      await db.getAllAsync(`SELECT passwordHash FROM users LIMIT 1`);
    } catch (e: any) {
      // Column doesn't exist, add it
      try {
        await db.execAsync(`ALTER TABLE users ADD COLUMN passwordHash TEXT`);
        await db.execAsync(`ALTER TABLE users ADD COLUMN salt TEXT`);
      } catch (alterError: any) {
        // Ignore if column already exists
        if (!alterError?.message?.includes("duplicate column")) {
          console.warn("Failed to add passwordHash/salt columns:", alterError);
        }
      }
    }
    
    // Add new columns to patients table if they don't exist (migration)
    const patientColumns = [
      { name: 'birthDate', type: 'TEXT NOT NULL DEFAULT ""' },
      { name: 'sex', type: 'TEXT NOT NULL DEFAULT "male"' },
      { name: 'weight', type: 'REAL' },
      { name: 'height', type: 'REAL' },
      { name: 'bmi', type: 'REAL' },
      { name: 'occupation', type: 'TEXT' },
      { name: 'education', type: 'INTEGER' },
      { name: 'affectedRightKnee', type: 'INTEGER NOT NULL DEFAULT 0' },
      { name: 'affectedLeftKnee', type: 'INTEGER NOT NULL DEFAULT 0' },
      { name: 'affectedRightHip', type: 'INTEGER NOT NULL DEFAULT 0' },
      { name: 'affectedLeftHip', type: 'INTEGER NOT NULL DEFAULT 0' },
      { name: 'medicalHistory', type: 'TEXT' },
      { name: 'timeAfterSymptoms', type: 'INTEGER' },
      { name: 'legDominance', type: 'TEXT NOT NULL DEFAULT "dominant"' },
      { name: 'contralateralJointAffect', type: 'INTEGER NOT NULL DEFAULT 0' },
      { name: 'physicallyActive', type: 'INTEGER NOT NULL DEFAULT 0' },
      { name: 'coMorbiditiesNMS', type: 'INTEGER NOT NULL DEFAULT 0' },
      { name: 'coMorbiditiesSystemic', type: 'INTEGER NOT NULL DEFAULT 0' },
      { name: 'doctorId', type: 'TEXT' },
    ];
    
    for (const col of patientColumns) {
      try {
        await db.getAllAsync(`SELECT ${col.name} FROM patients LIMIT 1`);
      } catch (e: any) {
        try {
          await db.execAsync(`ALTER TABLE patients ADD COLUMN ${col.name} ${col.type}`);
        } catch (alterError: any) {
          if (!alterError?.message?.includes("duplicate column")) {
            console.warn(`Failed to add ${col.name} column:`, alterError);
          }
        }
      }
    }
    
    // Add exerciseTypeId to sessions table if it doesn't exist
    try {
      await db.getAllAsync(`SELECT exerciseTypeId FROM sessions LIMIT 1`);
    } catch (e: any) {
      try {
        await db.execAsync(`ALTER TABLE sessions ADD COLUMN exerciseTypeId TEXT`);
      } catch (alterError: any) {
        if (!alterError?.message?.includes("duplicate column")) {
          console.warn("Failed to add exerciseTypeId column:", alterError);
        }
      }
    }
  }
}
