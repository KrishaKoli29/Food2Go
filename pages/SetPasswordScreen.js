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
} from "react-native";

import API_BASE from "../constants/api";

/**
 * SetPasswordScreen
 *
 * Shown after a customer successfully verifies their OTP.
 * Calls POST /api/auth/set-password, then logs the user in.
 *
 * Route params:
 *   email    {string}   – verified email address
 *   onLogin  {function} – called with "customer" to complete login
 */
export default function SetPasswordScreen({ route }) {
  const { email, onLogin } = route.params;

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSetPassword = async () => {
    if (!password || !confirmPassword) {
      Alert.alert("Missing Fields", "Please fill in both password fields.");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Too Short", "Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("Mismatch", "Passwords do not match. Please try again.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/set-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        Alert.alert("Error", data.message);
        return;
      }

      // Password saved — now log the customer in via /login
      const loginRes = await fetch(`${API_BASE}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const loginData = await loginRes.json();

      if (!loginRes.ok) {
        Alert.alert(
          "Password Set",
          "Your password was saved. Please go back and log in.",
        );
        return;
      }

      // Fully logged in
      onLogin(loginData.role);
    } catch (err) {
      Alert.alert(
        "Connection Error",
        "Could not reach the server. Make sure the backend is running and you're on the same Wi-Fi network.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.container}>
        <Text style={styles.title}>Set Your Password</Text>
        <Text style={styles.subtitle}>
          Almost done!{"\n"}Choose a password for{"\n"}
          <Text style={styles.emailHighlight}>{email}</Text>
        </Text>

        <TextInput
          style={styles.input}
          placeholder="New password (min. 6 characters)"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          editable={!loading}
        />
        <TextInput
          style={styles.input}
          placeholder="Confirm password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          editable={!loading}
        />

        {loading ? (
          <ActivityIndicator size="large" style={styles.loader} />
        ) : (
          <TouchableOpacity style={styles.btn} onPress={handleSetPassword}>
            <Text style={styles.btnText}>Set Password & Log In</Text>
          </TouchableOpacity>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    marginBottom: 12,
    textAlign: "center",
  },
  subtitle: {
    textAlign: "center",
    color: "#666",
    marginBottom: 28,
    lineHeight: 24,
    fontSize: 15,
  },
  emailHighlight: {
    color: "#111",
    fontWeight: "bold",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 12,
    marginBottom: 14,
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
  btnText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  loader: { marginTop: 24 },
});
