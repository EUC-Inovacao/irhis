import {
  UsersRepository,
  UserRecord,
  PatientsRepository,
} from "../storage/repositories";
import type { User } from "../types";

// Try to import expo-crypto, but make it optional
let Crypto: any = null;
try {
  Crypto = require("expo-crypto");
} catch (e) {
  console.warn("expo-crypto not available, using fallback hash");
}

function generateId(prefix: string = "u"): string {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
}

function toUser(record: UserRecord): User {
  return {
    id: record.id,
    email: record.email,
    name: record.name,
    role: record.role,
  } as User;
}

async function hashPassword(password: string, salt: string): Promise<string> {
  // Try expo-crypto first if available
  if (Crypto && typeof Crypto.digestStringAsync === "function") {
    try {
      return await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        salt + password
      );
    } catch (error) {
      console.warn("Crypto hashing failed, using fallback:", error);
    }
  }
  
  // Fallback hash function (simple but works for local-only)
  const combined = salt + password;
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16) + combined.length.toString(16);
}

export async function signup(
  name: string,
  email: string,
  password: string,
  role: "patient" | "doctor",
  birthDate?: string // Optional birthDate in YYYY-MM-DD format
): Promise<{ token: string; user: User }> {
  if (!name || !email || !password) {
    throw new Error("Name, email, and password are required");
  }

  // For patients, birthDate is required
  if (role === "patient" && !birthDate) {
    throw new Error("Birth date is required for patient accounts");
  }

  const now = new Date().toISOString();
  const existing = await UsersRepository.findByEmail(email);
  if (existing) {
    throw new Error("An account with this email already exists. Please login instead.");
  }

  try {
    const id = generateId(role === "doctor" ? "doc" : "pat");
    const salt = generateId("s");
    const passwordHash = await hashPassword(password, salt);
    
    await UsersRepository.create({
      id,
      name,
      email,
      role,
      createdAt: now,
      passwordHash,
      salt,
    });

    if (role === "patient") {
      // Create patient record with all required fields and defaults
      await PatientsRepository.upsert({
        id,
        name,
        email,
        birthDate: birthDate!, // Required for patients
        sex: 'male', // Default, can be edited later
        legDominance: 'dominant', // Default
        affectedRightKnee: false,
        affectedLeftKnee: false,
        affectedRightHip: false,
        affectedLeftHip: false,
        contralateralJointAffect: false,
        physicallyActive: false,
        coMorbiditiesNMS: false,
        coMorbiditiesSystemic: false,
        createdAt: now,
        doctorId: null, // Unassigned initially
      });
    }

    return { token: "local-token", user: { id, name, email, role } as User };
  } catch (error: any) {
    console.error("Signup error:", error);
    if (error.message?.includes("UNIQUE constraint")) {
      throw new Error("An account with this email already exists");
    }
    throw new Error(error?.message || "Failed to create account. Please try again.");
  }
}

export async function login(
  email: string,
  password: string
): Promise<{ token: string; user: User }> {
  if (!email || !password) {
    throw new Error("Email and password are required");
  }

  const existing = await UsersRepository.findByEmail(email);
  if (!existing) {
    throw new Error("Invalid email or password");
  }

  try {
    const salt = existing.salt ?? "";
    const expected = existing.passwordHash ?? "";
    
    if (!expected || !salt) {
      throw new Error("Account data is incomplete. Please sign up again.");
    }

    const candidate = await hashPassword(password, salt);
    if (candidate !== expected) {
      throw new Error("Invalid email or password");
    }

    // Role is taken directly from the stored user record
    return { token: "local-token", user: toUser(existing) };
  } catch (error: any) {
    console.error("Login error:", error);
    throw new Error(error?.message || "Failed to login. Please try again.");
  }
}
