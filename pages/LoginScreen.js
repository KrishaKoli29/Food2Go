import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";

import API_BASE from "../constants/api";

export default function LoginScreen({ navigation, onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // ─── CUSTOMER SIGN UP: email → OTP → set password ────────────────────────
  const handleCustomerSignUp = async () => {
    if (!email.trim()) {
      Alert.alert("Missing Email", "Please enter your email address.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/request-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json();

      if (!res.ok) {
        Alert.alert("Sign Up Failed", data.message);
        return;
      }

      // Navigate to OTP screen — password will be set AFTER verification
      navigation.navigate("OtpVerification", {
        email: email.trim().toLowerCase(),
        onLogin,
        mode: "signup", // tells OTP screen to go to SetPassword next
      });
    } catch (err) {
      Alert.alert("Connection Error", "Could not reach the server. Make sure the backend is running and you're on the same Wi-Fi network.");
    } finally {
      setLoading(false);
    }
  };

  // ─── BUSINESS SIGN UP: email + password → immediate login ────────────────
  const handleBusinessSignUp = async () => {
    if (!email.trim() || !password) {
      Alert.alert("Missing Fields", "Please enter both email and password.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
          role: "business",
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        Alert.alert("Sign Up Failed", data.message);
        return;
      }

      Alert.alert("Success", data.message, [
        { text: "Log In Now", onPress: handleLogin },
      ]);
    } catch (err) {
      Alert.alert("Connection Error", "Could not reach the server. Make sure the backend is running and you're on the same Wi-Fi network.");
    } finally {
      setLoading(false);
    }
  };

  // ─── LOGIN ───────────────────────────────────────────────────────────────
  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert("Missing Fields", "Please enter both email and password.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.requiresOtp) {
          // Account exists but email not yet verified — send them to OTP screen
          navigation.navigate("OtpVerification", {
            email: email.trim().toLowerCase(),
            onLogin,
            mode: "verify_existing",
          });
        } else {
          Alert.alert("Login Failed", data.message);
        }
        return;
      }

      onLogin(data.role);
    } catch (err) {
      Alert.alert("Connection Error", "Could not reach the server. Make sure the backend is running and you're on the same Wi-Fi network.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Food2Go</Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          editable={!loading}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          editable={!loading}
        />

        {loading ? (
          <ActivityIndicator size="large" style={styles.loader} />
        ) : (
          <>
            <TouchableOpacity style={styles.btn} onPress={handleLogin}>
              <Text style={styles.btnText}>Log In</Text>
            </TouchableOpacity>

            <Text style={styles.divider}>— or create a new account —</Text>

            <TouchableOpacity
              style={[styles.btn, styles.btnSecondary]}
              onPress={handleCustomerSignUp}
            >
              <Text style={styles.btnText}>Sign Up as Customer</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btn, styles.btnSecondary]}
              onPress={handleBusinessSignUp}
            >
              <Text style={styles.btnText}>Sign Up as Business</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 28,
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 12,
    marginBottom: 12,
    borderRadius: 8,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  btn: {
    backgroundColor: "#FF6B35",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    marginVertical: 6,
  },
  btnSecondary: {
    backgroundColor: "#555",
  },
  btnText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  divider: {
    textAlign: "center",
    color: "#999",
    marginVertical: 14,
  },
  loader: {
    marginTop: 24,
  },
});
