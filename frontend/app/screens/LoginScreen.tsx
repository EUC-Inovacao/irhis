import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../theme/ThemeContext";
// REMOVIDO: import SegmentedControl from "../components/SegmentedControl";
import { useAuth } from "../context/AuthContext";
import { Ionicons } from "@expo/vector-icons";

const LoginScreen = ({ navigation }: any) => {
  const { colors } = useTheme();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // REMOVIDO: const [role, setRole] = useState("Patient");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Required", "Please enter email and password.");
      return;
    }
    setLoading(true);
    try {
      // ATUALIZADO: Já não enviamos a role, o backend decide quem é
      await login(email, password); 
    } catch (error: any) {
      Alert.alert("Login Failed", error?.message || "Invalid credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'space-between' }} showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
            <Image
                source={require("../../assets/logo.png")}
                style={styles.logo}
            />
            <Text style={[styles.welcomeText, { color: colors.textSecondary }]}>
                Welcome back to
            </Text>
            <Text style={[styles.title, { color: colors.text }]}>TwinRehab</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Sign in to continue your rehabilitation journey
            </Text>
            </View>

            <View style={styles.form}>
            <View style={styles.inputContainer}>
                <Ionicons
                name="mail-outline"
                size={20}
                color={colors.textSecondary}
                style={styles.inputIcon}
                />
                <TextInput
                style={[
                    styles.input,
                    { backgroundColor: colors.card, color: colors.text },
                ]}
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholderTextColor={colors.textSecondary}
                />
            </View>

            <View style={styles.inputContainer}>
                <Ionicons
                name="lock-closed-outline"
                size={20}
                color={colors.textSecondary}
                style={styles.inputIcon}
                />
                <TextInput
                style={[
                    styles.input,
                    { backgroundColor: colors.card, color: colors.text },
                ]}
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                placeholderTextColor={colors.textSecondary}
                />
                <TouchableOpacity
                style={styles.passwordToggle}
                onPress={() => setShowPassword(!showPassword)}
                >
                <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color={colors.textSecondary}
                />
                </TouchableOpacity>
            </View>

            {/* REMOVIDO: SegmentedControl */}

            <TouchableOpacity
                style={[styles.button, { backgroundColor: colors.purple[600] }]}
                onPress={handleLogin}
                disabled={loading}
            >
                <Text style={[styles.buttonText, { color: colors.white }]}>
                {loading ? "Signing in..." : "Sign In"}
                </Text>
            </TouchableOpacity>

            {/* REMOVIDO: Link para Sign Up */}

            {/* Sign Up Link */}
            <View style={styles.signupContainer}>
                <Text style={[styles.signupLabel, { color: colors.textSecondary }]}>
                    Don't have an account?
                </Text>
                <TouchableOpacity onPress={() => navigation.navigate("InvitePatient")}>
                    <Text style={[styles.signupLink, { color: colors.purple[600] }]}>
                        Sign Up
                    </Text>
                </TouchableOpacity>
            </View>

            </View>

            <View style={styles.footer}>
            <Image
                source={require("../../assets/eu.png")}
                style={styles.footerImage}
            />
            </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    alignItems: "center",
    paddingTop: 40,
    paddingHorizontal: 24,
  },
  logo: {
    width: 120,
    height: 120,
    resizeMode: "contain",
    marginBottom: 24,
  },
  welcomeText: {
    fontSize: 16,
    marginBottom: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 32,
  },
  form: {
    padding: 24,
  },
  inputContainer: {
    position: "relative",
    marginBottom: 16,
  },
  input: {
    height: 56,
    paddingHorizontal: 48,
    borderRadius: 12,
    fontSize: 16,
  },
  inputIcon: {
    position: "absolute",
    left: 16,
    top: 18,
  },
  passwordToggle: {
    position: "absolute",
    right: 16,
    top: 18,
  },
  button: {
    height: 56,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
    marginBottom: 16,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  // REMOVIDO: Styles do linkText que já não é usado
  
  // ESTILOS PARA O LINK DE SIGN UP
  signupContainer: {
    marginTop: 24,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    paddingTop: 16,
  },
  signupLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  signupLink: {
    fontSize: 14,
    fontWeight: "bold",
  },
  footer: {
    alignItems: "center",
    paddingBottom: 24,
    marginTop: 20,
  },
  footerImage: {
    width: 200,
    height: 40,
    resizeMode: "contain",
  },
});

export default LoginScreen;