import React, { createContext, useState, useEffect, useContext } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as RemoteAuth from "@services/auth";
import * as LocalAuth from "@services/localAuthService";
import type { User } from "../types";
import api from "@services/api";

interface AuthContextData {
  user: User | null;
  loading: boolean;
  login(
    email: string,
    password: string,
    role: "patient" | "doctor"
  ): Promise<void>;
  signup(
    name: string,
    email: string,
    password: string,
    role: "patient" | "doctor"
  ): Promise<void>;
  selectRole(role: "patient" | "doctor"): Promise<void>;
  logout(): void;
}

interface AuthProviderProps {
  children: React.ReactNode;
  onPatientSignup?: (name: string, userId: string) => void;
}

export const AuthContext = createContext<AuthContextData>(
  {} as AuthContextData
);

export const AuthProvider: React.FC<AuthProviderProps> = ({
  children,
  onPatientSignup,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const interceptor = api.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          await logout();
        }
        return Promise.reject(error);
      }
    );

    return () => api.interceptors.response.eject(interceptor);
  }, []);

  const logout = async () => {
    setUser(null);
    await AsyncStorage.multiRemove(["@iRHIS:token", "@iRHIS:user"]);
    delete api.defaults.headers.common["Authorization"];
  };

  const loadStorageData = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("@iRHIS:token");
      const storedUser = await AsyncStorage.getItem("@iRHIS:user");

      if (token && storedUser) {
        api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
        setUser(JSON.parse(storedUser));
      }
    } catch (e) {
      console.error("Failed to load auth data from storage", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStorageData();
  }, []);

  const login = async (
    email: string,
    password: string,
    role: "patient" | "doctor"
  ) => {
    const { token, user: loggedInUser } = await LocalAuth.login(
      email,
      password,
      role
    );
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    await AsyncStorage.setItem("@iRHIS:token", token);
    await AsyncStorage.setItem("@iRHIS:user", JSON.stringify(loggedInUser));
    setUser(loggedInUser);
  };

  const signup = async (
    name: string,
    email: string,
    password: string,
    role: "patient" | "doctor"
  ) => {
    try {
      const { token, user: signedUpUser } = await LocalAuth.signup(
        name,
        email,
        password,
        role
      );
      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      await AsyncStorage.setItem("@iRHIS:token", token);
      await AsyncStorage.setItem("@iRHIS:user", JSON.stringify(signedUpUser));
      setUser(signedUpUser);
      if (role === "patient" && onPatientSignup) {
        onPatientSignup(name, signedUpUser.id);
      }
    } catch (e: any) {
      console.error("Signup error (local):", e);
      throw e;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        signup,
        selectRole: async (role: "patient" | "doctor") => {
          const dummyUser: User = {
            id: "local-user",
            email: `local@${role}.app`,
            name: role === "doctor" ? "Doctor" : "Patient",
            role,
          };
          const dummyToken = "local-token";
          await AsyncStorage.setItem("@iRHIS:token", dummyToken);
          await AsyncStorage.setItem("@iRHIS:user", JSON.stringify(dummyUser));
          setUser(dummyUser);
        },
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  return useContext(AuthContext);
}
