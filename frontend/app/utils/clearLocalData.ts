/**
 * Utility to clear local SQLite database
 * Use this if you suspect local data is interfering with remote data
 */

import { getDatabase } from "../storage/db";

export async function clearLocalPatients(): Promise<void> {
  const db = getDatabase();
  
  return new Promise((resolve, reject) => {
    db.transaction(
      (tx: any) => {
        tx.executeSql("DELETE FROM patients", [], () => {
          console.log("Local patients table cleared");
        });
      },
      (error: any) => {
        console.error("Error clearing local patients:", error);
        reject(error);
      },
      () => {
        resolve();
      }
    );
  });
}

export async function clearLocalUsers(): Promise<void> {
  const db = getDatabase();
  
  return new Promise((resolve, reject) => {
    db.transaction(
      (tx: any) => {
        tx.executeSql("DELETE FROM users", [], () => {
          console.log("Local users table cleared");
        });
      },
      (error: any) => {
        console.error("Error clearing local users:", error);
        reject(error);
      },
      () => {
        resolve();
      }
    );
  });
}

export async function clearAllLocalData(): Promise<void> {
  await Promise.all([
    clearLocalPatients(),
    clearLocalUsers(),
  ]);
  console.log("All local data cleared");
}
