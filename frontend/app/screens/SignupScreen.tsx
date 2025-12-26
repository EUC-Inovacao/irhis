import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useTheme } from "../theme/ThemeContext";
import SegmentedControl from "../components/SegmentedControl";
import TermsAndConditionsModal from "../components/TermsAndConditionsModal";
import { useAuth } from "@context/AuthContext";
import { Ionicons } from "@expo/vector-icons";

const SignupScreen = ({ navigation }: any) => {
  const { colors } = useTheme();
  const { signup } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("Patient");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  const handleSignup = async () => {
    if (!name || !email || !password) {
      Alert.alert("Error", "Please fill in all fields.");
      return;
    }

    if (!acceptedTerms) {
      Alert.alert(
        "Error",
        "Please accept the Terms and Conditions to continue."
      );
      return;
    }

    setLoading(true);
    try {
      await signup(
        name,
        email,
        password,
        role.toLowerCase() as "patient" | "doctor"
      );
    } catch (error: any) {
      Alert.alert(
        "Signup Failed",
        error?.message || "Could not create account."
      );
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
        <View style={styles.header}>
          <Image
            source={require("../../assets/logo.png")}
            style={styles.logo}
          />
          <Text style={[styles.welcomeText, { color: colors.textSecondary }]}>
            Welcome to
          </Text>
          <Text style={[styles.title, { color: colors.text }]}>TwinRehab</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Create an account to start your rehabilitation journey
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Ionicons
              name="person-outline"
              size={20}
              color={colors.textSecondary}
              style={styles.inputIcon}
            />
            <TextInput
              style={[
                styles.input,
                { backgroundColor: colors.card, color: colors.text },
              ]}
              placeholder="Full Name"
              value={name}
              onChangeText={setName}
              placeholderTextColor={colors.textSecondary}
            />
          </View>

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

          <SegmentedControl
            options={["Patient", "Doctor"]}
            selectedValue={role}
            onValueChange={setRole}
          />

          <View style={styles.termsContainer}>
            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={() => setAcceptedTerms(!acceptedTerms)}
            >
              <View
                style={[
                  styles.checkbox,
                  {
                    backgroundColor: acceptedTerms
                      ? colors.purple[600]
                      : colors.card,
                    borderColor: colors.purple[600],
                  },
                ]}
              >
                {acceptedTerms && (
                  <Ionicons name="checkmark" size={16} color={colors.white} />
                )}
              </View>
              <Text style={[styles.termsText, { color: colors.textSecondary }]}>
                I accept the{" "}
                <TouchableOpacity onPress={() => setShowTermsModal(true)}>
                  <Text
                    style={[styles.termsLink, { color: colors.purple[600] }]}
                  >
                    Terms and Conditions
                  </Text>
                </TouchableOpacity>
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.purple[600] }]}
            onPress={handleSignup}
            disabled={loading}
          >
            <Text style={[styles.buttonText, { color: colors.white }]}>
              {loading ? "Creating Account..." : "Create Account"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate("Login")}>
            <Text style={[styles.linkText, { color: colors.purple[600] }]}>
              Already have an account?{" "}
              <Text style={{ fontWeight: "600" }}>Sign In</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <TermsAndConditionsModal
        visible={showTermsModal}
        onClose={() => setShowTermsModal(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: "space-between",
  },
  header: {
    alignItems: "center",
    paddingTop: 20,
    paddingHorizontal: 24,
  },
  logo: {
    width: 100,
    height: 100,
    resizeMode: "contain",
    marginBottom: 16,
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
    marginBottom: 20,
  },
  form: {
    padding: 24,
  },
  inputContainer: {
    position: "relative",
    marginBottom: 12,
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
    marginTop: 16,
    marginBottom: 12,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  linkText: {
    textAlign: "center",
    fontSize: 14,
  },
  footer: {
    alignItems: "center",
    paddingBottom: 24,
  },
  footerImage: {
    width: 200,
    height: 40,
    resizeMode: "contain",
  },
  termsContainer: {
    marginTop: 16,
    marginBottom: 16,
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  termsText: {
    fontSize: 14,
  },
  termsLink: {
    textDecorationLine: "underline",
  },
});

export default SignupScreen;
