import { UsersRepository, PatientsRepository } from "./repositories";
import { seedExerciseTypes } from "./exerciseSeed";
// Removed setupDemoPatientData import - no mock data

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

      // If patient, also create patient record with required fields
      if (userData.role === "patient") {
        // Use default values for required fields (user can update later)
        const defaultBirthDate = new Date();
        defaultBirthDate.setFullYear(defaultBirthDate.getFullYear() - 30); // Default age 30
        
        await PatientsRepository.upsert({
          id,
          name: userData.name,
          email: userData.email,
          birthDate: defaultBirthDate.toISOString().split('T')[0], // YYYY-MM-DD format
          sex: 'male' as const, // Default, user can update
          affectedRightKnee: false,
          affectedLeftKnee: false,
          affectedRightHip: false,
          affectedLeftHip: false,
          legDominance: 'dominant' as const, // Default
          contralateralJointAffect: false,
          physicallyActive: false,
          coMorbiditiesNMS: false,
          coMorbiditiesSystemic: false,
          createdAt: now,
          doctorId: null, // Unassigned initially
        });
      }

      console.log(`✓ Created ${userData.role}: ${userData.email}`);
    } catch (error: any) {
      console.error(`Failed to create user ${userData.email}:`, error);
    }
  }

  // NO MOCK DATA - All data must come from real exercise sessions
  // Removed setupDemoPatientData() call - no mock data generation
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
