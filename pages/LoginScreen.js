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
import { useAuth } from "../AuthContext";

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();

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
        body: JSON.stringify({ email: email.trim().toLowerCase(), role: "customer" }),
      });
      const data = await res.json();

      if (!res.ok) {
        Alert.alert("Sign Up Failed", data.message);
        return;
      }

      navigation.navigate("OtpVerification", {
        email: email.trim().toLowerCase(),
        role: "customer",
        mode: "signup",
      });
    } catch (err) {
      Alert.alert("Connection Error", "Could not reach the server. Make sure the backend is running and you're on the same Wi-Fi network.");
    } finally {
      setLoading(false);
    }
  };

  // ─── BUSINESS SIGN UP: email → OTP → set password ────────────────────────
  // Now mirrors the customer flow — no direct password entry on this screen.
  const handleBusinessSignUp = async () => {
    if (!email.trim()) {
      Alert.alert("Missing Email", "Please enter your email address.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/request-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), role: "business" }),
      });
      const data = await res.json();

      if (!res.ok) {
        Alert.alert("Sign Up Failed", data.message);
        return;
      }

      navigation.navigate("OtpVerification", {
        email: email.trim().toLowerCase(),
        role: "business",
        mode: "signup",
      });
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
          navigation.navigate("OtpVerification", {
            email: email.trim().toLowerCase(),
            role: data.role || "customer",
            mode: "verify_existing",
          });
        } else {
          Alert.alert("Login Failed", data.message);
        }
        return;
      }

      // Persist token + role + userId in AsyncStorage via context
      await login({ token: data.token, role: data.role, userId: data.userId });
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
        <Text style={styles.tagline}>Rescue Surplus Food • Gujarat</Text>

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
          placeholder="Password (for login)"
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
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 4,
    textAlign: "center",
    color: "#FF6B35",
  },
  tagline: {
    textAlign: "center",
    color: "#888",
    fontSize: 13,
    marginBottom: 32,
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
