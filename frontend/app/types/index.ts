export interface User {
  id: string;
  email: string;
  name: string;
  role: "patient" | "doctor";
  active: number;
}

/** @deprecated Use Session from API instead */
export interface RecoveryProcess {
  id: string;
  name: string;
  completed: boolean;
  assignedDate?: string;
  lastModified?: string;
  instructions?: string;
  targetRepetitions?: number;
  targetSets?: number;
  videoUrl?: string;
}

/** Session from API (GET/POST /patients/:id/sessions) */
export interface SessionMetric {
  ID?: string;
  SessionID?: string;
  Joint?: string;
  Side?: string;
  Repetitions?: number;
  MinVelocity?: number;
  MaxVelocity?: number;
  AvgVelocity?: number;
  P95Velocity?: number;
  MinROM?: number;
  MaxROM?: number;
  AvgROM?: number;
  CenterMassDisplacement?: string;
  TimeCreated?: string;
}

export interface SessionFeedback {
  ID?: string;
  UserID?: string;
  SessionID?: string;
  Pain?: number;
  Fatigue?: number;
  Difficulty?: number;
  Comments?: string;
  TimeCreated?: string;
}

export interface Session {
  id: string;
  relationId?: string;
  exerciseType: string;
  exerciseDescription?: string;
  repetitions?: number | null;
  duration?: string | null;
  timeCreated: string;
  metrics?: SessionMetric[];
  feedback?: SessionFeedback[];
}

export interface WeeklyLog {
  week: number;
  pain: number;
  discomfort: number;
  tiredness: number;
  strength: number;
}

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  completed: boolean;
}

export interface PatientDetails {
  age: number;
  sex: "Male" | "Female" | "Other";
  height: number; // in meters
  weight: number; // in kg
  bmi: number;
  clinicalInfo: string;
  medicalHistory?: string;
  allergies?: string[];
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
}

export interface JointPosition {
  x: number;
  y: number;
  z: number;
}

export interface JointPositions {
  ankle: JointPosition;
  knee: JointPosition;
  hip: JointPosition;
  timestamp: string;
}

export interface SegmentOrientation {
  qx: number;
  qy: number;
  qz: number;
  qw: number;
}

export interface SegmentOrientations {
  foot: SegmentOrientation;
  tibia: SegmentOrientation;
  femur: SegmentOrientation;
  timestamp: string;
}

export interface GaitParameters {
  stepLength: number;
  cadence: number;
  timestamp: string;
}

export interface MovementData {
  jointPositions: JointPositions[];
  segmentOrientations: SegmentOrientations[];
  gaitParameters: GaitParameters[];
  timestamp: string;
  exerciseId: string;
}

export interface PatientFeedback {
  sessionId: string;
  timestamp: string;
  pain: number;
  fatigue: number;
  difficulty: number;
  comments: string;
}

export interface Patient {
  id: string;
  name: string;
  details?: PatientDetails;
  recovery_process: RecoveryProcess[];
  doctor?: {
    id: string;
    name: string;
  };
  medications?: Medication[];
  weekly_logs?: WeeklyLog[];
  movementData?: MovementData[];
  feedback?: PatientFeedback[];
  healthData?: HealthData[];
}

export interface HealthData {
  steps: number;
  calories: number;
  distance: number; // in meters
  activeMinutes: number;
  heartRate?: {
    current: number;
    min: number;
    max: number;
    resting: number;
  };
  timestamp: string;
}

export interface DailyHealthData {
  date: string;
  steps: number;
  calories: number;
  distance: number;
  activeMinutes: number;
  heartRate?: {
    average: number;
    min: number;
    max: number;
    resting: number;
  };
  goals: {
    steps: number;
    calories: number;
    activeMinutes: number;
  };
}

export interface HealthDevice {
  id: string;
  name: string;
  type: "APPLE_WATCH" | "FITBIT" | "GARMIN" | "ANDROID_FITNESS";
  connected: boolean;
  lastSync?: string;
}

export interface HealthServiceConfig {
  type: HealthDevice["type"];
  permissions: string[];
  scopes: string[];
}

export interface ZipFileData {
  jointPositions?: JointPositions[];
  segmentOrientations?: SegmentOrientations[];
  gaitParameters?: GaitParameters[];
  raw?: {
    accelerometer?: { x: number; y: number; z: number; timestamp: string }[];
    gyroscope?: { x: number; y: number; z: number; timestamp: string }[];
  };
}

// Analysis Types - No repetitions, ROM and velocity only
export interface KneeHipMetrics {
  rom: number;
  maxFlexion: number;
  maxExtension: number;
  maxAbduction?: number;
  maxRotation?: number;
  avgVelocity: number;
  peakVelocity: number;
  p95Velocity: number;
  repetitions?: number;
}

export interface CoMResult {
  verticalAmp_cm: number;
  mlAmp_cm: number;
  apAmp_cm: number;
  rms_cm: number;
}

export interface AnalysisResult {
  knee: { left: KneeHipMetrics; right: KneeHipMetrics };
  hip: { left: KneeHipMetrics; right: KneeHipMetrics };
  com: CoMResult;
  asymmetry: {
    romDifference_knee: number;
    romDifference_hip: number;
    dominantSide_knee: "left" | "right" | "balanced";
    dominantSide_hip: "left" | "right" | "balanced";
  };
  missingSensors?: string[];
}
export type RootStackParamList = {
  Home: undefined;
  Login: undefined;
  Signup: undefined;

  PatientDetail: { patientId: string; role: string };
  SessionDetail: { sessionId: string; patientId: string };
  CreatePatient: undefined;
  InvitePatient: undefined;
  ManageInvites: undefined;
  PatientList: undefined;
  
  Profile: { twoFactorEnabled?: boolean } | undefined;
  
  BleConnection: undefined;
  
  ExerciseDetail: { exercise: any };
  ExerciseHistory: undefined;
  ExerciseHistoryDetail: { session: Session };

  // Novas Rotas da Task IRHIS-25
  ChangePassword: undefined;
  TwoFactorSetup: undefined;
  PrivacyNotice: undefined;
  HelpCenter: undefined;
  About: undefined;

  // NOVAS ROTAS IRHIS-46 (ONBOARDING):
  TokenEntry: undefined;
  TokenInvalid: { reason: string };
  OnboardingPrivacy: { token: string; role?: string; inviteeName?: string; email?: string };
  OnboardingLegal: { token: string; role?: string; inviteeName?: string; email?: string; acceptedTermsAt: string };
  OnboardingPassword: {
    token: string;
    acceptedTermsAt: string;
    consentClinicalDataAt?: string;
    nif?: string;
    legalBasis?: 'consent' | 'secrecy';
    role?: string;
    inviteeName?: string;
    email?: string;
  };
  OnboardingTwoFactor: { token: string };
  OnboardingTwoFactorVerify: { token: string };
  CreatePasswordDoctor: { token: string }; // NOVA ROTA
  RegistrationComplete: { token: string; user: User };
};