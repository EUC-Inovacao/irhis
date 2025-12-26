import { UsersRepository, PatientsRepository } from "./repositories";
import { seedExerciseTypes } from "./exerciseSeed";
import { setupDemoPatientData } from "./mockDataGenerator";

// Simple hash function (same as fallback in localAuthService)
function simpleHash(password: string, salt: string): string {
  const combined = salt + password;
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16) + combined.length.toString(16);
}

function generateId(prefix: string = "u"): string {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
}

export async function seedPresetUsers(): Promise<void> {
  const now = new Date().toISOString();

  const presetUsers = [
    // Doctors
    {
      name: "Dr. Sarah Johnson",
      email: "doctor@irhis.app",
      password: "doctor123",
      role: "doctor" as const,
    },
    {
      name: "Dr. Michael Chen",
      email: "mchen@irhis.app",
      password: "doctor123",
      role: "doctor" as const,
    },
    // Patients
    {
      name: "John Smith",
      email: "patient@irhis.app",
      password: "patient123",
      role: "patient" as const,
    },
    {
      name: "Maria Garcia",
      email: "maria@irhis.app",
      password: "patient123",
      role: "patient" as const,
    },
    {
      name: "Robert Williams",
      email: "robert@irhis.app",
      password: "patient123",
      role: "patient" as const,
    },
  ];

  for (const userData of presetUsers) {
    try {
      // Check if user already exists
      const existing = await UsersRepository.findByEmail(userData.email);
      if (existing) {
        console.log(`User ${userData.email} already exists, skipping...`);
        continue;
      }

      // Create user
      const id = generateId(userData.role === "doctor" ? "doc" : "pat");
      const salt = generateId("s");
      const passwordHash = simpleHash(userData.password, salt);

      await UsersRepository.create({
        id,
        name: userData.name,
        email: userData.email,
        role: userData.role,
        createdAt: now,
        passwordHash,
        salt,
      });

      // If patient, also create patient record
      if (userData.role === "patient") {
        await PatientsRepository.upsert({
          id,
          name: userData.name,
          email: userData.email,
          dateOfBirth: undefined,
          createdAt: now,
          doctorId: null, // Unassigned initially
        });
      }

      console.log(`✓ Created ${userData.role}: ${userData.email}`);
    } catch (error: any) {
      console.error(`Failed to create user ${userData.email}:`, error);
    }
  }

  // Setup demo patient data (assign exercises and generate progress)
  // This runs after users are created, but only if patients don't have sessions
  try {
    await setupDemoPatientData();
  } catch (error) {
    console.error("Failed to setup demo patient data:", error);
    // Don't throw - this is optional demo data
  }
}

// Export login credentials for reference
export const PRESET_CREDENTIALS = {
  doctors: [
    {
      email: "doctor@irhis.app",
      password: "doctor123",
      name: "Dr. Sarah Johnson",
    },
    {
      email: "mchen@irhis.app",
      password: "doctor123",
      name: "Dr. Michael Chen",
    },
  ],
  patients: [
    { email: "patient@irhis.app", password: "patient123", name: "John Smith" },
    { email: "maria@irhis.app", password: "patient123", name: "Maria Garcia" },
    {
      email: "robert@irhis.app",
      password: "patient123",
      name: "Robert Williams",
    },
  ],
};
